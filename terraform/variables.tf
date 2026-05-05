variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "The target AWS region for your infrastructure"
}

variable "budget_amount" {
  type        = string
  default     = "10.0" # Keeps it tiny so we don't accidentally spend money
  description = "Monthly dollar budget limit for tracking"
}