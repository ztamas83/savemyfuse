# Deployment Setup Guide

This guide will help you set up automated deployment to Google Cloud using GitHub Actions with Workload Identity Federation using Terraform.

## Overview

The deployment is split into two phases:

1. **Infrastructure Setup** (`tf-infrastructure/`) - One-time manual setup by privileged user
2. **Service Deployment** (`tf-service/`) - Automated deployment via GitHub Actions

## Prerequisites

1. A Google Cloud Project with billing enabled
2. GitHub repository with admin access
3. Terraform installed locally (>= 1.13)
4. Google Cloud CLI installed and authenticated
5. Project Owner or equivalent permissions for initial setup

## Phase 1: Infrastructure Setup (Manual, One-time)

This phase creates the Workload Identity Federation configuration and GitHub Actions service account.

### Step 1: Authenticate with Google Cloud

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Step 2: Set up Infrastructure with Terraform

```bash
cd tf-infrastructure/

# Create variables file
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project details

# Initialize and apply Terraform
terraform init
terraform plan
terraform apply
```

This will create:

- Workload Identity Pool and Provider
- GitHub Actions service account with minimal permissions
- Required API enablements
- Security restrictions for repository-specific access

### Step 3: Get GitHub Secrets Values

After Terraform completes, get the values needed for GitHub secrets:

```bash
terraform output github_secrets_summary
```

## Phase 2: Configure GitHub Secrets

Add the following variables and secrets to your GitHub repository (Settings → Secrets and variables → Actions):

#### From Terraform Output:

Use the values from `terraform output github_secrets_summary`:

- `WIF_PROVIDER`: Workload identity provider name
- `WIF_SERVICE_ACCOUNT`: Service account email
- `GCP_PROJECT_ID`: Your Google Cloud Project ID

#### Application-Specific Secrets:

- `EASEE_USER`: Your Easee username
- `ADMIN_EMAIL`: Admin email address
- `CHAT_NOTIFICATION_CHANNEL`: (Optional) Chat notification channel

| Variable Name               | Type     | Source            | Description                              | Example Value                                                                                     |
| --------------------------- | -------- | ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`            | Variable | Manual            | Your Google Cloud Project ID             | `your-project-id`                                                                                 |
| `WIF_PROVIDER`              | Secret   | Terraform Output  | Workload Identity Provider resource name | `projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `WIF_SERVICE_ACCOUNT`       | Secret   | Terraform Output  | Service account email for GitHub Actions | `github-actions@your-project.iam.gserviceaccount.com`                                             |
| `EASEE_USER`                | Secret   | Manual            | Your Easee username                      | `your-easee-username`                                                                             |
| `ADMIN_EMAIL`               | Secret   | Manual            | Admin email address                      | `admin@yourdomain.com`                                                                            |
| `CHAT_NOTIFICATION_CHANNEL` | Secret   | Manual (Optional) | Google Chat notification channel         | `spaces/XXXX-X8xeed`                                                                              |

## Phase 3: Service Configuration

### 1. Set up Service Terraform Variables

```bash
cd tf-service/
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your application settings
```

### 2. Test the Deployment

1. **Create a feature branch** and make changes to `tf-service/`
2. **Create a pull request** - GitHub Actions will show Terraform plan in PR comments
3. **Merge to master** - GitHub Actions automatically applies the changes

## Deployment Workflow

### Automated Deployment Triggers:

- **Pull Requests**: Shows Terraform plan in PR comments (no changes applied)
- **Master Branch**: Automatically applies Terraform changes on merge
- **Manual Trigger**: Can be triggered manually via GitHub Actions UI

### What Gets Deployed:

- Changes in `tf-service/` directory trigger service infrastructure updates
- Changes in `src/easee-control/` trigger application redeployment
- Changes in workflow files trigger pipeline updates

## Architecture description

### **Separation of Concerns**

- **Infrastructure Setup**: One-time, privileged setup with full security configuration
- **Service Deployment**: Automated, restricted deployment with minimal permissions

### **Security**

- **Principle of Least Privilege**: Service account has only required roles:
  - `roles/datastore.owner` - Cloud Datastore Owner
  - `roles/cloudfunctions.admin` - Cloud Functions Admin
  - `roles/resourcemanager.projectIamAdmin` - Project IAM Admin
  - `roles/pubsub.admin` - Pub/Sub Admin
  - `roles/iam.serviceAccountAdmin` - Service Account Admin
  - `roles/storage.admin` - Storage Admin
- **Workload Identity Federation**: Short-lived tokens, no service account keys
- **Repository-Specific Access**: Only specified repository can use this identity

### **Maintainability**

- **Infrastructure as Code**: All configuration versioned and reviewable
- **Automated Deployments**: Consistent, repeatable deployments
- **State Management**: Centralized state in GCS bucket## Troubleshooting

1. **Authentication Issues**: Verify that the workload identity pool and provider are correctly configured
2. **Permission Issues**: Check that the service account has the necessary IAM roles
3. **Terraform State Issues**: Ensure the state bucket exists and the service account has access to it
