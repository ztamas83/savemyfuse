# Service Infrastructure

This directory contains the Terraform configuration for your application infrastructure that gets deployed via GitHub Actions CI/CD.

## Overview

This Terraform configuration manages your application's Google Cloud resources:

- Cloud Functions
- Pub/Sub topics and subscriptions
- Cloud Datastore/Firestore
- IAM configurations for application services
- Storage buckets
- Other application-specific resources

## Automated Deployment

This infrastructure is automatically deployed via GitHub Actions when:

- Changes are pushed to the `master` branch in the `tf-service/` directory
- Pull requests are created (shows plan in PR comments)
- Manually triggered via GitHub Actions UI

## Prerequisites

The infrastructure setup in `tf-infrastructure/` must be completed first to create:

- Workload Identity Federation configuration
- GitHub Actions service account with proper permissions
- Required GitHub secrets

## Local Development

To work with this configuration locally:

1. **Authenticate with Google Cloud**:

   ```bash
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Initialize Terraform**:

   ```bash
   terraform init -backend-config="savemyfuse.backend"
   ```

3. **Plan changes**:
   ```bash
   terraform plan -var-file="terraform.tfvars"
   ```

## Configuration

### Variables File

Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in your values:

- Application-specific configuration
- Environment settings
- Resource names and settings

### Backend Configuration

The `savemyfuse.backend` file contains the GCS backend configuration for storing Terraform state.
Example: `bucket = "myproject-tf-states"`

## CI/CD Workflow

The GitHub Actions workflow (`../.github/workflows/deploy.yml`) handles:

1. **Authentication** via Workload Identity Federation
2. **Terraform Init** with backend configuration
3. **Terraform Plan** for all changes
4. **PR Comments** showing planned changes
5. **Terraform Apply** on master branch merges

## Security

- Uses Workload Identity Federation (no service account keys)
- Service account has minimal required permissions
- Access restricted to specific GitHub repository
- State stored in secure GCS bucket

## Monitoring

Monitor deployments via:

- GitHub Actions logs
- Google Cloud Console
- Terraform state in GCS bucket
