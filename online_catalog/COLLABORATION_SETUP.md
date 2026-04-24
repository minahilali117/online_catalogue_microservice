# Collaboration Setup Guide

This file is the shared setup and working guide for both collaborators in this project.

## Project Collaboration Model

We are using one AWS account with separate IAM users.

Why this model:
- Faster setup for a university project
- Easier resource sharing (same EC2, same state, same region)
- Better for teamwork with Terraform remote state locking

## What Has Already Been Completed (Owner Side)

The project owner has completed the following Phase 1 tasks:
- Created IAM user for collaborator
- Generated programmatic access keys for collaborator
- Created Terraform state S3 bucket
- Enabled S3 bucket versioning
- Enabled S3 bucket encryption (AES256)
- Initialized Terraform backend migration

Current shared AWS values:
- AWS Account ID: 186072212411
- AWS Region: us-east-1
- Terraform state bucket: online-catalog-tf-state-186072212411
- Terraform lock table: terraform-locks

## Owner Responsibilities (You)

1. IAM and credentials
- Keep AWS root account private and do not share root credentials
- Share only IAM user credentials with collaborator
- Rotate collaborator access keys if they are ever exposed

2. Secure sharing
- Share collaborator Access Key ID and Secret Access Key securely
- Share EC2 SSH key securely (online-catalog-key.pem), or create a dedicated key for collaborator
- Never send secrets in public chats or public repos

3. Terraform backend consistency
- Keep backend configuration aligned for both users
- Confirm both users run Terraform in the same region and same workspace folder

4. Governance
- Approve any terraform destroy action before it is run
- Decide who performs apply for infra changes during each session

## Collaborator Responsibilities (Friend)

1. Configure AWS CLI

Run:

```bash
aws configure
```

Use:
- AWS Access Key ID: value shared by owner
- AWS Secret Access Key: value shared by owner
- Default region: us-east-1
- Default output: json

Verify:

```bash
aws sts get-caller-identity
```

Expected:
- Returns account 186072212411
- Returns IAM user identity (not root)

2. Set up SSH key for EC2 access

Receive online-catalog-key.pem securely from owner.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.ssh" | Out-Null
Move-Item "C:\Users\<friend>\Downloads\online-catalog-key.pem" "$env:USERPROFILE\.ssh\online-catalog-key.pem"
icacls "$env:USERPROFILE\.ssh\online-catalog-key.pem" /inheritance:r
icacls "$env:USERPROFILE\.ssh\online-catalog-key.pem" /grant:r "$env:USERNAME`:F"
```

WSL/Linux/macOS:

```bash
mkdir -p ~/.ssh
mv ~/Downloads/online-catalog-key.pem ~/.ssh/online-catalog-key.pem
chmod 400 ~/.ssh/online-catalog-key.pem
```

3. Clone project repository

```bash
git clone <repo-url>
cd online_catalog
```

4. Initialize Terraform backend from project folder

```bash
cd infra/terraform
terraform init
```

Expected:
- Backend points to S3 bucket online-catalog-tf-state-186072212411
- Locking configured with DynamoDB table terraform-locks

5. Verify AWS resource visibility

```bash
aws ec2 describe-instances --region us-east-1
```

Expected:
- Can list project EC2 resources

6. Verify SSH to EC2

```bash
ssh -i ~/.ssh/online-catalog-key.pem ec2-user@<ec2-public-ip>
```

Expected:
- Successful login
- Then run checks:

```bash
docker --version
kind get clusters
kubectl get nodes
```

## Shared Terraform Backend Configuration

Both collaborators should use this backend block in infra/terraform/backend.tf:

```hcl
terraform {
	backend "s3" {
		bucket         = "online-catalog-tf-state-186072212411"
		key            = "prod/terraform.tfstate"
		region         = "us-east-1"
		dynamodb_table = "terraform-locks"
		encrypt        = true
	}
}
```

## Collaboration Test Plan

Run these tests once both users complete setup.

1. Identity test (both users)

```bash
aws sts get-caller-identity
```

Pass if:
- Both users show same account ID 186072212411
- Each user is their own IAM identity

2. Terraform read test (both users)

```bash
cd infra/terraform
terraform init
terraform plan
```

Pass if:
- Both users can initialize backend
- Both users can read state and produce a plan

3. Terraform lock test (state locking)

User A runs:

```bash
cd infra/terraform
terraform apply
```

While apply is running, User B runs:

```bash
cd infra/terraform
terraform plan
```

Pass if:
- User B waits or gets lock message
- No concurrent state write occurs

4. SSH and node tooling test (collaborator)

```bash
ssh -i ~/.ssh/online-catalog-key.pem ec2-user@<ec2-public-ip>
docker --version
kind get clusters
kubectl get nodes
```

Pass if:
- SSH works
- Cluster and node details are returned

5. Git collaboration test

User A:

```bash
git checkout -b feat/test-collab-a
echo "test" >> collab-check-a.txt
git add .
git commit -m "collab test a"
git push -u origin feat/test-collab-a
```

User B:

```bash
git fetch --all
git checkout feat/test-collab-a
```

Pass if:
- Both can share and fetch branch changes

## Collaboration Rules

1. Terraform safety rules
- Always run terraform plan before terraform apply
- Never run terraform destroy without notifying and getting approval from teammate
- Do not manually change AWS resources that are managed by Terraform

2. Source control rules
- Pull latest changes before starting work
- Use feature branches for new work
- Write clear commit messages
- Open pull requests for review before merging to main

3. Secrets and access rules
- Do not commit secrets, key files, terraform state, or credential files
- Do not share credentials in plain chat
- Rotate keys immediately if exposed

4. Session coordination rules
- One collaborator handles infra apply at a time
- Announce when starting and finishing any infra change
- Keep a short shared log of major changes

## Recommended .gitignore Entries

Ensure these are ignored:

```gitignore
.terraform/
*.tfstate
*.tfstate.backup
terraform.tfvars
*.pem
.env
```

## Daily Workflow (Both Collaborators)

1. Pull latest changes

```bash
git pull
```

2. Validate infra before changes

```bash
cd infra/terraform
terraform plan
```

3. Make and test your changes

4. Commit and push

```bash
git add .
git commit -m "describe change"
git push
```

5. Coordinate before apply/destroy

## End of Project Cleanup

When project work is complete:
- Run terraform destroy once with team confirmation
- Verify EC2, VPC, and related resources are removed
- Keep S3 backend bucket and DynamoDB table only if future reuse is needed; otherwise remove both

Cleanup commands:

```bash
cd infra/terraform
terraform destroy
```

Optional backend cleanup:

```bash
aws s3 rb s3://online-catalog-tf-state-186072212411 --force
aws dynamodb delete-table --table-name terraform-locks --region us-east-1
```