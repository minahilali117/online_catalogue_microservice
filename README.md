
# Online Catalog - Artifact-Focused Setup and Testing Guide

This README is a practical runbook for new users. It explains the microservices architecture, setup flow, and how to test each implemented artifact.

This project now uses a shared-account collaboration model with separate IAM users and remote Terraform state.

Full demo test script with expected results is available in `TESTING_GUIDE.md`.
Collaboration onboarding details are in `COLLABORATION_SETUP.md`.

## Scope Covered

1. Artifact 1: Containerization (Docker)
2. Artifact 2: Infrastructure as Code (Terraform)
3. Artifact 3: Configuration as Code (Ansible)

## Demo Ownership and Collaboration Model

1. Demo presenter: project owner runs the live demo from owner laptop.
2. Collaborator: works on remaining implementation steps (Artifact 4 and Artifact 5) and submits code via Git.
3. AWS model: one AWS account, separate IAM users, shared Terraform backend.
4. Terraform state: stored in S3 and locked with DynamoDB to prevent concurrent state corruption.

Shared backend used by both collaborators:

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

## Services and Ports

1. Frontend: 3000
2. Catalog Management: 8081
3. Customer Support: 8082
4. Order Processing: 8083

## Microservices Architecture

1. Frontend (React) calls backend APIs over HTTP.
2. Catalog Management service handles product CRUD.
3. Customer Support service handles customer CRUD and customer-side aggregation.
4. Order Processing service handles checkout, orders, and status lifecycle.
5. Each backend service has its own data store, so services remain independently deployable.
6. For infrastructure, Terraform provisions one EC2 node with networking and security resources.
7. Ansible configures that EC2 node and bootstraps a local Kubernetes cluster (kind).

## New User Setup

### Local Prerequisites

1. Git
2. Docker Desktop (with Docker Compose)
3. Node.js 22+
4. Terraform 1.8+
5. AWS CLI configured with valid credentials
6. WSL2 (Ubuntu recommended) for Ansible execution

### AWS Prerequisites

1. AWS region selected (this project uses us-east-1).
2. EC2 key pair created in the same region.
3. Your current public IP available for SSH allowlisting in CIDR form (x.x.x.x/32).

### First-Time Repository Setup

1. Clone the repository.
2. From project root, install local dependencies only if you need non-containerized local runs.
3. For Terraform, copy `infra/terraform/terraform.tfvars.example` to `infra/terraform/terraform.tfvars` and set real values.
4. For Ansible, copy `infra/ansible/inventory.example.ini` to `infra/ansible/inventory.ini` and set the EC2 public IP.

## Artifact 1 - Docker

### Requirement Mapping

1. Unique Dockerfile per microservice: completed.
2. Automated image build: completed via Docker Compose.

### Test Steps

Run from project root:

```powershell
cd online_catalog
docker compose build
docker compose up -d
docker ps
```

Verify endpoints:

1. http://localhost:3000
2. http://localhost:8081/products
3. http://localhost:8082/customers
4. http://localhost:8083/orders

Stop containers:

```powershell
docker compose down
```

### Evidence to Capture

1. Dockerfiles for each microservice.
2. `docker compose build` success output.
3. `docker compose up -d` success output.
4. `docker ps` with running containers.
5. Browser/API checks for ports 3000, 8081, 8082, 8083.

## Artifact 2 - Terraform

### Requirement Mapping

1. AWS Provisioning with Terraform: EC2 resource defined and applied.
2. Networking and Security: VPC, subnet, IGW, route table, and security group defined.

### Prerequisites

1. AWS CLI configured.
2. EC2 key pair exists in `us-east-1`.
3. `terraform.tfvars` has real values, especially `ssh_ingress_cidr = "your.public.ip/32"`.
4. `backend.tf` is configured for shared remote state.

### Apply Steps

Run from Terraform directory:

```powershell
cd online_catalog/infra/terraform
terraform init
terraform validate
terraform plan -out tfplan
terraform apply tfplan
terraform output
```

If you are collaborating, always run:

```powershell
terraform plan
```

before apply, and coordinate with teammate so only one person applies at a time.

### What to Test After Apply

1. AWS Console (region `us-east-1`) shows created resources:
	VPC, Subnet, Internet Gateway, Route Table, Security Group, EC2.
2. `terraform output` returns:
	`ec2_public_ip`, `ec2_public_dns`, `vpc_id`, `public_subnet_id`, `security_group_id`.
3. EC2 instance state is `running`.
4. Security group allows SSH only from your IP `/32`.

### Evidence to Capture

1. `terraform validate` success.
2. `terraform plan -out tfplan` output summary.
3. `terraform apply tfplan` completion output.
4. `terraform output` values.
5. AWS Console screenshots for EC2, VPC, Subnet, Security Group.

## Artifact 3 - Ansible

### What It Does

1. Connects to the Terraform-created EC2 instance.
2. Installs Docker, Git, kubectl, and kind.
3. Starts Docker and adds `ec2-user` to the Docker group.
4. Creates a single-node kind cluster named `online-catalog`.
5. Verifies node readiness so the machine is cluster-ready for Kubernetes manifests.

### Files Added

1. `infra/ansible/ansible.cfg`
2. `infra/ansible/inventory.example.ini`
3. `infra/ansible/playbooks/site.yml`

### What You Still Need To Do

1. Ensure the EC2 instance exists and is running.
2. Get the public IP from `terraform output`.
3. Copy `inventory.example.ini` to `inventory.ini` and replace the placeholder IP.
4. Ensure your `.pem` file is available in WSL and referenced in inventory.
5. If collaborator has updated infrastructure, run `terraform output` first and refresh inventory with current EC2 public IP.

### Run Steps

From WSL in the repo:

```bash
cd /mnt/d/university/SEMESTER\ 8/cloud\ computing/project3/online_catalog/infra/ansible
ansible -i inventory.ini ec2 -m ping
ansible-playbook -i inventory.ini playbooks/site.yml
```

### What to Test After Running

1. `ansible -m ping` succeeds.
2. Docker version command works on EC2.
3. `kind get clusters` shows `online-catalog`.
4. `kubectl get nodes` shows the control-plane node as `Ready`.
5. Re-running the playbook does not fail (idempotency check).

### Evidence to Capture

1. Inventory file with the EC2 public IP removed or blurred.
2. `ansible -m ping` success output.
3. `ansible-playbook` success output.
4. SSH session showing `docker --version`, `kind get clusters`, and `kubectl get nodes`.

## Quick Validation Flow

1. Docker: `docker compose build`, `docker compose up -d`, endpoint checks on ports 3000/8081/8082/8083.
2. Terraform: `terraform validate`, `terraform plan`, `terraform apply`, `terraform output`.
3. Ansible: `ansible -m ping`, `ansible-playbook`, SSH checks for docker/kind/kubectl.

## Owner Demo Flow (Laptop)

Use this sequence when you present:

1. Pull latest code from main branch (including collaborator contributions).
2. Run Docker artifact checks locally from your laptop.
3. Run Terraform plan/apply from owner laptop only.
4. Run Ansible checks from owner laptop only.
5. Show outputs and screenshots as evidence.
6. End with cleanup using `terraform destroy`.

This keeps demo execution consistent and avoids concurrent infra changes during presentation.

## Cost Cleanup (Free Tier Safety)

Run this when demo/testing is done:

```powershell
cd online_catalog/infra/terraform
terraform destroy
```

Capture one final screenshot of successful destroy for documentation.
