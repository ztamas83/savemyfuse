# Infrastructure Setup

This directory contains Terraform configuration for setting up the Google Cloud infrastructure required for GitHub Actions CI/CD with Workload Identity Federation.

## Overview

This setup creates:

- Workload Identity Pool and Provider for GitHub Actions
- Service Account with specific IAM roles for CI/CD
- Proper security restrictions to only allow your specific repository

## Prerequisites

1. **Google Cloud CLI** installed and authenticated with a privileged account
2. **Terraform** installed (>= 1.0)
3. **Project Owner or equivalent permissions** in the target GCP project

## Setup Instructions

### 1. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Create Terraform Variables

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your actual values
```

Required variables:

- `project_id`: Your Google Cloud project ID
- `region`: Target region (default: europe-north1)
- `github_repository`: Your GitHub repository (ztamas83/savemyfuse)
- `github_actions_roles`: List of IAM roles (pre-configured with minimal required permissions)

### 3. Initialize and Apply Terraform

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

### 4. Configure GitHub Secrets

After successful deployment, Terraform will output the values you need to configure as GitHub secrets:

```bash
terraform output github_secrets_summary
```

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `WIF_PROVIDER`: The workload identity provider name
- `WIF_SERVICE_ACCOUNT`: The service account email
- `GCP_PROJECT_ID`: Your project ID
- `EASEE_USER`: Your Easee username
- `ADMIN_EMAIL`: Admin email address
- `CHAT_NOTIFICATION_CHANNEL`: (Optional) Chat notification channel

## Security Features

- **Principle of Least Privilege**: Service account has only the minimum required roles
- **Repository-Specific Access**: Only `ztamas83/savemyfuse` can use this identity
- **Short-Lived Tokens**: Workload Identity Federation provides temporary access tokens
- **No Service Account Keys**: More secure than traditional key-based authentication

## IAM Roles Granted

The GitHub Actions service account receives these specific roles:

- `roles/datastore.owner` - Cloud Datastore Owner
- `roles/cloudfunctions.admin` - Cloud Functions Admin
- `roles/resourcemanager.projectIamAdmin` - Project IAM Admin
- `roles/pubsub.admin` - Pub/Sub Admin
- `roles/iam.serviceAccountAdmin` - Service Account Admin
- `roles/storage.admin` - Storage Admin

## State Management

By default, this uses local state. For production environments, consider using a GCS backend:

1. Create a GCS bucket for Terraform state
2. Uncomment and configure the GCS backend in `main.tf`
3. Run `terraform init` to migrate state

## Troubleshooting

### Permission Issues

Ensure you have the following permissions in the target project:

- `roles/owner` or equivalent
- `roles/iam.workloadIdentityPoolAdmin`
- `roles/iam.serviceAccountAdmin`

### API Issues

If you get API errors, ensure the required APIs are enabled:

```bash
gcloud services enable iamcredentials.googleapis.com
gcloud services enable sts.googleapis.com
```

### State Issues

If you encounter state issues:

```bash
terraform refresh
terraform plan
```

## Cleanup

To remove all infrastructure:

```bash
terraform destroy
```

**Warning**: This will delete the workload identity configuration and service account. Make sure to remove the GitHub secrets afterward.

## Next Steps

After infrastructure setup is complete:

1. Configure GitHub secrets with the output values
2. The `tf-service` directory contains your application infrastructure
3. GitHub Actions will automatically deploy changes to `tf-service` when you push to master
