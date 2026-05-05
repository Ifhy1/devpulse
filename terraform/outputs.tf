output "clean_api_url" {
  value       = "${aws_apigatewayv2_api.http_api.api_endpoint}/metrics"
  description = "The absolute, clean URL to paste into your browser"
}

output "clean_automation_url" {
  value       = "${aws_apigatewayv2_api.http_api.api_endpoint}/actions/cleanup"
  description = "The absolute URL to trigger the Cloud cost optimization action"
}