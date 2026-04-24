# Online Catalog Testing Guide

This guide is for demo execution and grading. It covers only the artifacts completed so far:

1. Containerization (Docker)
2. Infrastructure as Code (Terraform)
3. Configuration as Code (Ansible)

Assumption for this version of the guide:

1. The project owner gives the demo from the owner laptop.
2. The collaborator contributes code and setup work, but demo commands are executed by the owner to keep flow consistent.
3. Collaboration uses one AWS account, separate IAM users, and shared Terraform remote state.

For each step, this guide includes:

1. The tool used
2. The general purpose of the tool
3. The project-specific purpose
4. Commands to run
5. What the step tests
6. Expected results

## Demo Run Order

Use this order in your demo:

1. Docker tests (Artifact 1)
2. Terraform tests (Artifact 2)
3. Ansible tests (Artifact 3)
4. Safe shutdown and cost cleanup

Pre-demo collaboration sync:

1. Owner pulls latest code from main.
2. Owner confirms no open infra changes are being applied by collaborator.
3. Owner runs Terraform from owner laptop only during demo window.

Sync commands before demo:

```bash
git pull
cd infra/terraform
terraform init
terraform plan
```

## Artifact 1: Docker Testing

### Tool

1. Docker and Docker Compose

### General purpose of the tool

1. Build portable container images.
2. Run multi-service systems in isolated containers.
3. Start and stop many services using one command.

### Purpose in this project

1. Build and run frontend + 3 backend microservices consistently.
2. Verify each service can run from its Dockerfile.

### Commands

Run from project root:

```powershell
cd online_catalog
docker compose build
docker compose up -d
docker ps
```

Endpoint checks:

1. http://localhost:3000
2. http://localhost:8081/products
3. http://localhost:8082/customers
4. http://localhost:8083/orders

### What this tests

1. Dockerfiles are valid and build successfully.
2. Compose wiring for all services is correct.
3. Services are reachable on expected ports.
4. API paths respond correctly.

### Expected results

1. Build finishes without errors.
2. docker ps shows frontend and backend containers running.
3. Frontend page loads at port 3000.
4. API endpoints return valid JSON responses.

### Evidence to capture

1. docker compose build output.
2. docker compose up -d output.
3. docker ps output.
4. Browser and API response screenshots.

## Artifact 2: Terraform Testing

### Tool

1. Terraform
2. AWS provider for Terraform

### General purpose of the tool

1. Provision cloud infrastructure from code.
2. Keep infrastructure reproducible and version controlled.
3. Manage lifecycle (create, update, destroy).

### Purpose in this project

1. Provision AWS EC2 + VPC networking stack.
2. Configure secure SSH access and app ports.

### Commands

Run from Terraform folder:

```powershell
cd online_catalog/infra/terraform
terraform init
terraform validate
terraform plan -out tfplan
terraform apply tfplan
terraform output
```

Collaboration safety checks before apply:

```powershell
aws sts get-caller-identity
terraform state pull
```

Expected:

1. Account ID is 186072212411.
2. State pull succeeds from shared backend.

### What this tests

1. Terraform config syntax and provider setup are valid.
2. Resources can be created in AWS from code.
3. Outputs expose required connection details.
4. Shared backend and lock behavior are functioning for collaboration.

### Expected results

1. terraform validate returns success.
2. terraform apply completes without failed resources.
3. terraform output shows:
   1. ec2_public_ip
   2. ec2_public_dns
   3. vpc_id
   4. public_subnet_id
   5. security_group_id
4. AWS Console shows running EC2 and created networking resources.

### Evidence to capture

1. terraform validate success.
2. terraform plan summary.
3. terraform apply success.
4. terraform output values.
5. AWS Console screenshots for EC2, VPC, Subnet, Security Group.

## Artifact 3: Ansible Testing

### Tool

1. Ansible
2. SSH
3. kind and kubectl

### General purpose of the tool

1. Automate server configuration and setup.
2. Make server setup repeatable and idempotent.
3. Avoid manual, error-prone shell setup.

### Purpose in this project

1. Configure Terraform-provisioned EC2 automatically.
2. Install Docker and Kubernetes tooling.
3. Initialize a local single-node Kubernetes cluster for next artifact.

### Required files

1. infra/ansible/ansible.cfg
2. infra/ansible/inventory.ini
3. infra/ansible/playbooks/site.yml

### Commands

From WSL:

```bash
cd /mnt/d/university/SEMESTER\ 8/cloud\ computing/project3/online_catalog/infra/ansible
ansible -i inventory.ini ec2 -m ping
ansible-playbook -i inventory.ini playbooks/site.yml
```

If collaborator updated infrastructure before demo, refresh target IP first:

```bash
cd /mnt/d/university/SEMESTER\ 8/cloud\ computing/project3/online_catalog/infra/terraform
terraform output
```

Then update infra/ansible/inventory.ini with the latest ec2_public_ip.

Post-run verification on EC2:

```bash
ssh -i ~/.ssh/online-catalog-key.pem ec2-user@<EC2_PUBLIC_IP>
docker --version
kind get clusters
KUBECONFIG=/home/ec2-user/.kube/config kubectl get nodes -o wide
```

### What this tests

1. SSH connectivity and Ansible host targeting.
2. Automated package and runtime setup on EC2.
3. Local cluster initialization succeeds.
4. Node reaches Ready state.

### Expected results

1. ansible ping returns pong.
2. playbook completes without failed tasks.
3. kind get clusters shows online-catalog.
4. kubectl get nodes shows control-plane node in Ready status.

### Evidence to capture

1. ansible ping success output.
2. ansible-playbook success output.
3. docker version output from EC2.
4. kind get clusters and kubectl get nodes output.

## Safe Stop and Cost Cleanup

Use this section after demo to avoid charges.

### Step 1: Stop local Docker containers

Run from project root:

```powershell
cd online_catalog
docker compose down
```

What this does:

1. Stops and removes local project containers.
2. Prevents unnecessary local resource usage.

### Step 2: Remove kind cluster on EC2 (optional but recommended)

From local machine:

```bash
ssh -i ~/.ssh/online-catalog-key.pem ec2-user@<EC2_PUBLIC_IP> "kind delete cluster --name online-catalog"
```

What this does:

1. Removes local Kubernetes cluster resources on EC2.
2. Frees memory and disk on the instance.

### Step 3: Destroy AWS infrastructure (main cost saver)

Run from Terraform folder:

```powershell
cd online_catalog/infra/terraform
terraform destroy
```

What this does:

1. Deletes Terraform-managed AWS resources.
2. Stops EC2 billing from this stack.

### Step 4: Verify no paid resources remain

Check in AWS Console:

1. EC2 Instances: no running instances from this project.
2. EBS Volumes: no leftover unattached project volumes.
3. Elastic IPs: no allocated but unassociated addresses.
4. VPC resources from this project are removed.

## Quick Demo Script

1. Show docker compose build and running services.
2. Show Terraform apply and output values.
3. Show Ansible ping and playbook run.
4. Show cluster readiness with kubectl get nodes.
5. Show cleanup command terraform destroy at the end.

## Collaboration Validation (Run Before Final Demo Day)

Use this once to prove both teammates are correctly configured.

1. Identity check (both users):

```bash
aws sts get-caller-identity
```

Pass criteria:

1. Both users show account 186072212411.
2. Both users are IAM users (not root).

2. Terraform backend check (both users):

```bash
cd infra/terraform
terraform init
terraform plan
```

Pass criteria:

1. Both users can initialize backend.
2. Both users can read the same shared state.

3. Locking check (controlled test):

1. User A starts a terraform apply.
2. User B runs terraform plan while apply is in progress.

Pass criteria:

1. User B waits or receives lock-related message.
2. No concurrent state write occurs.


This sequence demonstrates implementation, validation, and responsible cost control.
