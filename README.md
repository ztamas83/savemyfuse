# SaveMyFuse

A generic load limiter to protect home fuses

## Architecture

This project is structured into separate components:

### Source Code

- `src/easee-control/` - Python application for Easee EV charger control
- `src/status-page/` - React/TypeScript web application for monitoring

### Infrastructure as Code

- `tf-infrastructure/` - **Manual setup** - Creates Google Cloud Workload Identity Federation for CI/CD
- `tf-service/` - **Automated deployment** - Application infrastructure deployed via GitHub Actions

### Deployment

- `.github/workflows/` - GitHub Actions CI/CD pipeline
- `scripts/` - Setup and utility scripts

## Getting Started

### 1. Infrastructure Setup (One-time, Manual)

The `tf-infrastructure/` directory contains Terraform configuration that must be run manually by a privileged user to set up:

- Google Cloud Workload Identity Federation
- GitHub Actions service account with minimal required permissions
- Security restrictions for repository-specific access

```bash
cd tf-infrastructure/
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform plan
terraform apply
```

### 2. Configure GitHub Secrets

After infrastructure setup, configure these GitHub repository secrets:

- `WIF_PROVIDER` - Workload identity provider (from Terraform output)
- `WIF_SERVICE_ACCOUNT` - Service account email (from Terraform output)
- `GCP_PROJECT_ID` - Your Google Cloud project ID
- `EASEE_USER` - Your Easee username
- `ADMIN_EMAIL` - Admin email address
- `CHAT_NOTIFICATION_CHANNEL` - (Optional) Chat notification channel

### 3. Application Deployment (Automated)

The `tf-service/` directory contains your application infrastructure that gets automatically deployed via GitHub Actions when changes are pushed to the `master` branch.

## Security Features

- **Workload Identity Federation**: No service account keys required
- **Principle of Least Privilege**: Minimal IAM permissions
- **Repository-Specific Access**: Only this repository can trigger deployments
- **Automated Security**: Infrastructure and application code separated

## Development Workflow

1. Make changes to application code or `tf-service/` infrastructure
2. Create pull request - GitHub Actions shows Terraform plan
3. Merge to master - GitHub Actions automatically deploys changes
4. Monitor deployment in GitHub Actions and Google Cloud Console
