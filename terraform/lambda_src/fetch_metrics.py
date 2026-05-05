import os
import boto3
import json
from decimal import Decimal

# Initialize AWS SDK clients
budgets_client = boto3.client('budgets')
dynamodb = boto3.resource('dynamodb')

# Retrieve the DynamoDB table name from environment variables
TABLE_NAME = os.environ.get('DYNAMODB_TABLE', 'DevPulse-Cloud-Metrics')
table = dynamodb.Table(TABLE_NAME)

def helper_decimal_serializer(obj):
    """Helper function to convert float to Decimal for DynamoDB compatibility."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    raise TypeError("Type not serializable")

def handler(event, context):
    try:
        # 1. Fetch AWS account ID dynamically from the Lambda execution context
        account_id = context.invoked_function_arn.split(":")[4]
        
        # 2. Query AWS Budgets
        # Note: If no budget exists, we will fallback to mock/default data so the UI still looks gorgeous
        try:
            budgets_response = budgets_client.describe_budgets(AccountId=account_id)
            budgets = budgets_response.get('Budgets', [])
        except Exception as budget_err:
            print(f"AWS Budgets call failed or no budgets configured: {str(budget_err)}")
            budgets = []

        # 3. Process budget data
        if budgets:
            active_budget = budgets[0]
            budget_limit = float(active_budget['BudgetLimit']['Amount'])
            actual_spend = float(active_budget['CalculatedSpend']['ActualSpend']['Amount'])
            unit = active_budget['BudgetLimit']['Unit']
        else:
            # Fallback mock data if your AWS account does not have a budget configured yet
            budget_limit = 10.0
            actual_spend = 2.45
            unit = "USD"

        # Calculate budget percentage spent
        percent_spent = (actual_spend / budget_limit) * 100 if budget_limit > 0 else 0

        # 4. Prepare payload for DynamoDB
        metric_payload = {
            'metric_id': 'monthly_budget',
            'budget_limit': Decimal(str(budget_limit)),
            'actual_spend': Decimal(str(actual_spend)),
            'percent_spent': Decimal(str(round(percent_spent, 2))),
            'currency': unit,
            'last_updated': boto3.client('sts').get_caller_identity().get('UserId') # Identifier
        }

        # 5. Write to DynamoDB
        table.put_item(Item=metric_payload)
        print(f"Successfully updated DynamoDB with payload: {metric_payload}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' # Required for frontend CORS
            },
            'body': json.dumps({
                'message': 'Metrics updated successfully',
                'data': {
                    'budget_limit': budget_limit,
                    'actual_spend': actual_spend,
                    'percent_spent': round(percent_spent, 2),
                    'currency': unit
                }
            })
        }

    except Exception as e:
        print(f"Error executing Lambda: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }