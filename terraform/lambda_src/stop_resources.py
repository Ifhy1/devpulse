import os
import boto3
import json

ec2_client = boto3.client('ec2')

def handler(event, context):
    try:
        # 1. Scan for running EC2 instances with the tag 'DevPulseMode: Idle'
        filters = [
            {
                'Name': 'instance-state-name',
                'Values': ['running']
            },
            {
                'Name': 'tag:DevPulseMode',
                'Values': ['Idle', 'idle']
            }
        ]
        
        # Describe instances matching our filter
        response = ec2_client.describe_instances(Filters=filters)
        
        instance_ids = []
        for reservation in response.get('Reservations', []):
            for instance in reservation.get('Instances', []):
                instance_ids.append(instance['InstanceId'])
        
        # 2. If we found instances, stop them!
        if instance_ids:
            ec2_client.stop_instances(InstanceIds=instance_ids)
            message = f"Successfully stopped {len(instance_ids)} idle instance(s): {', '.join(instance_ids)}"
            status = "optimized"
        else:
            # Friendly fallback message if no idle instances are running
            message = "Scan complete. No idle development instances found. Your cloud is fully optimized!"
            status = "clean"

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' # Required for frontend CORS
            },
            'body': json.dumps({
                'status': status,
                'message': message,
                'action_taken': 'stop_idle_instances',
                'affected_resources': instance_ids
            })
        }

    except Exception as e:
        print(f"Error executing cost optimizer: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }