terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# DynamoDB Table to store aggregated budget & cost metrics
resource "aws_dynamodb_table" "devpulse_metrics" {
  name         = "DevPulse-Cloud-Metrics"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "metric_id" # e.g., "monthly_budget" or "daily_spend"

  attribute {
    name = "metric_id"
    type = "S"
  }

  tags = {
    Environment = "Dev"
    Project     = "DevPulse"
  }
}

# Package the Python file as a zip archive dynamically
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda_src/fetch_metrics.py"
  output_path = "${path.module}/lambda_src/fetch_metrics.zip"
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "devpulse_lambda_execution_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for Lambda permissions (CloudWatch logs, DynamoDB put, and Budgets read)
resource "aws_iam_role_policy" "lambda_permissions" {
  name = "devpulse_lambda_permissions"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Write Logs to CloudWatch
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        # Read from AWS Budgets
        Effect = "Allow"
        Action = [
          "budgets:ViewBudget"
        ]
        Resource = "*"
      },
      {
        # Write to our DynamoDB Table
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.devpulse_metrics.arn
      }
    ]
  })
}

# The AWS Lambda Function
resource "aws_lambda_function" "fetch_metrics" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "DevPulse-FetchMetrics"
  role             = aws_iam_role.lambda_role.arn
  handler          = "fetch_metrics.handler"
  runtime          = "python3.11"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.devpulse_metrics.name
    }
  }
}

# 1. Create the HTTP API Gateway
resource "aws_apigatewayv2_api" "http_api" {
  name          = "devpulse-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"] # We'll allow all origins for development; we can restrict this later
    allow_methods = ["GET", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
    max_age       = 300
  }
}

# 2. Create the Stage (Default auto-deploy stage)
resource "aws_apigatewayv2_stage" "api_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

# 3. Create the Lambda Integration
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.fetch_metrics.invoke_arn
}

# 4. Create the GET /metrics Route
resource "aws_apigatewayv2_route" "metrics_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET /metrics"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# 5. Permission for API Gateway to call our Lambda
resource "aws_lambda_permission" "api_gw_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fetch_metrics.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

# 1. Package the automation Python file as a zip
data "archive_file" "stop_resources_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda_src/stop_resources.py"
  output_path = "${path.module}/lambda_src/stop_resources.zip"
}

# 2. IAM Policy to allow the Lambda to describe and stop EC2 instances
resource "aws_iam_role_policy" "automation_permissions" {
  name = "devpulse_automation_permissions"
  role = aws_iam_role.lambda_role.id # We can reuse the same execution role

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:StopInstances"
        ]
        Resource = "*"
      }
    ]
  })
}

# 3. Create the Automation Lambda Function
resource "aws_lambda_function" "stop_resources" {
  filename         = data.archive_file.stop_resources_zip.output_path
  function_name    = "DevPulse-StopIdleResources"
  role             = aws_iam_role.lambda_role.arn
  handler          = "stop_resources.handler"
  runtime          = "python3.11"
  source_code_hash = data.archive_file.stop_resources_zip.output_base64sha256
}

# 4. Create the API Gateway Integration for the Automation Lambda
resource "aws_apigatewayv2_integration" "automation_integration" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.stop_resources.invoke_arn
}

# 5. Create the POST /actions/cleanup Route
resource "aws_apigatewayv2_route" "automation_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /actions/cleanup"
  target    = "integrations/${aws_apigatewayv2_integration.automation_integration.id}"
}

# 6. Give API Gateway permission to invoke our Automation Lambda
resource "aws_lambda_permission" "api_gw_automation_permission" {
  statement_id  = "AllowAPIGatewayInvokeAutomation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stop_resources.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}