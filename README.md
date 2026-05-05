# DevPulse

DevPulse is a serverless cloud-monitoring and resource optimization dashboard. It provides real-time visibility into AWS budgets and automates cost-saving resource cleanups through a responsive, modern web interface.

## Live Demo
Check out the live dashboard here: [Insert Your Vercel URL Here]

---

## The Architecture

- **Frontend:** Next.js (App Router), Tailwind CSS v4, Lucide React Icons (Hosted on Vercel)
- **Infrastructure as Code (IaC):** 100% of the AWS resources are dynamically provisioned using HashiCorp Terraform.
- **Serverless API Gateway:** Routes HTTP requests safely to backend Lambda compute functions.
- **On-Demand Compute:** AWS Lambda functions (written in Python) to handle backend queries and resource automation.
- **Data Caching:** Amazon DynamoDB serves as a responsive, NoSQL database caching layer to store budget metrics and prevent rate-limiting or excessive AWS cost API fees.

---

## Key Automation Features

### 1. Cost Caching Engine
To prevent spamming the AWS Budgets API (which can lead to rate limits and unnecessary account fees), DevPulse uses a write-through caching model. The backend queries AWS Budgets, stores the calculated state in DynamoDB, and serves the frontend directly from the database.

### 2. One-Click Cloud Optimization (Active Cleanup)
Clicking the "Optimize Cloud Spend" button triggers an active AWS Lambda function that scans the EC2 environment using boto3. It identifies running development instances tagged with "DevPulseMode: Idle" and safely stops them to eliminate idle resource waste.
