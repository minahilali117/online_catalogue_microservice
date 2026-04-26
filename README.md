
# Online Catalog - Artifact-Focused Setup and Testing Guide

This README is a practical runbook for new users. It explains the microservices architecture, setup flow, and how to test each implemented artifact.

This project now uses a shared-account collaboration model with separate IAM users and remote Terraform state.

Full demo test script with expected results is available in `TESTING_GUIDE.md`.
Collaboration onboarding details are in `COLLABORATION_SETUP.md`.

## Scope Covered

1. Artifact 1: Containerization (Docker)
2. Artifact 2: Infrastructure as Code (Terraform)
3. Artifact 3: Configuration as Code (Ansible)
4. Artifact 4: Cluster Deployment (Kubernetes Manifests)
5. Artifact 5: CI/CD (GitHub Actions + Argo CD)

## Demo Ownership and Collaboration Model
1. AWS model: one AWS account, separate IAM users, shared Terraform backend.
2. Terraform state: stored in S3 and locked with DynamoDB to prevent concurrent state corruption.

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

Docker Compose (local):

1. Frontend: 3000
2. Catalog Management: 8081
3. Customer Support: 8082
4. Order Processing: 8083

Kubernetes on kind (EC2 public access):

1. Frontend: 3000
2. Catalog Management: 30081
3. Customer Support: 30082
4. Order Processing: 30083

## Microservices Architecture

1. Frontend (React) calls backend APIs over HTTP.
2. Catalog Management service handles product CRUD.
3. Customer Support service handles customer CRUD and customer-side aggregation.
4. Order Processing service handles checkout, orders, and status lifecycle.
5. Each backend service has its own data store, so services remain independently deployable.
6. For infrastructure, Terraform provisions one EC2 node with networking and security resources.
7. Ansible configures that EC2 node and bootstraps a local Kubernetes cluster (kind).

## End-to-End CICD Pipeline

This project pipeline runs in this order:

1. Code is pushed to GitHub.
2. GitHub Actions builds and pushes 4 Docker images to Docker Hub (`ayaankhan17`).
3. The workflow updates image tags in Kubernetes manifests and pushes the manifest commit.
4. Argo CD (running on EC2 kind cluster) detects manifest changes and auto-syncs.
5. Updated workloads are rolled out in namespace `online-catalog`.

## Quickstart Command Playbooks

Use this section first. It is organized for:

1. First-time setup on a fresh machine/cloud environment.
2. Regular repeat runs after first setup.
3. Fast troubleshooting commands for common issues.

### First-Time Setup (From Zero)

1. Clone and prepare config files:

```powershell
git clone https://github.com/minahilali117/online_catalogue_microservice
cd online_catalogue_microservice
copy online_catalog\infra\terraform\terraform.tfvars.example online_catalog\infra\terraform\terraform.tfvars
copy online_catalog\infra\ansible\inventory.example.ini online_catalog\infra\ansible\inventory.ini
```

2. Initialize and apply Terraform:

```powershell
cd online_catalog\infra\terraform
terraform init
terraform validate
terraform plan -out tfplan
terraform apply tfplan
terraform output
```

3. Update EC2 IP in project files (inventory, frontend yaml/env, notes, docs) after Terraform apply:

```powershell
cd ..\..\..
.\online_catalog\scripts\update-ec2-ip.ps1
```

4. Push any IP updates so repo/manifests are current:

```powershell
git add .
git commit -m "chore: update EC2 IP references"
git push origin master
```

5. Run Ansible bootstrap from WSL:

```bash
cd /mnt/c/Users/<your-user>/Documents/University/Semester\ 8/Cloud\ Computing/Project/online_catalogue_microservice/online_catalog/infra/ansible
ansible -i inventory.ini ec2 -m ping
ansible-playbook -i inventory.ini playbooks/site.yml
```

6. Verify cluster and Argo CD:

```bash
ssh -i ~/.ssh/online-catalog-key.pem ec2-user@<EC2_PUBLIC_IP>
export KUBECONFIG=/home/ec2-user/.kube/config
kubectl get nodes
kubectl get pods -n argocd
kubectl get application -n argocd
```

7. Configure GitHub secrets once:

1. `DOCKERHUB_TOKEN`
2. Workflow permission: Read and write

8. Trigger pipeline by pushing code:

```powershell
git add .
git commit -m "feat: trigger full CI/CD"
git push origin master
```

### Following Times (Regular Usage)

After first-time setup, use this shorter flow:

1. Pull latest changes:

```powershell
git pull origin master
```

2. If EC2 was recreated, refresh infra and IP references:

```powershell
cd online_catalog\infra\terraform
terraform plan -out tfplan
terraform apply tfplan
cd ..\..\..
.\online_catalog\scripts\update-ec2-ip.ps1
git add .
git commit -m "chore: refresh EC2 IP"
git push origin master
```

3. Re-run Ansible when host/cluster needs rebootstrap:

```bash
cd /mnt/c/Users/<your-user>/Documents/University/Semester\ 8/Cloud\ Computing/Project/online_catalogue_microservice/online_catalog/infra/ansible
ansible-playbook -i inventory.ini playbooks/site.yml
```

4. For normal app updates, just push code and let CI/CD + Argo CD handle rollout.

### Troubleshooting Commands (Copy/Paste)

1. Check Terraform state and outputs:

```powershell
cd online_catalog\infra\terraform
terraform state list
terraform output
```

2. Check SSH and Ansible connectivity:

```bash
ssh -i ~/.ssh/online-catalog-key.pem ec2-user@<EC2_PUBLIC_IP>
ansible -i inventory.ini ec2 -m ping
```

3. Check kind and Kubernetes health:

```bash
export KUBECONFIG=/home/ec2-user/.kube/config
kubectl get nodes -o wide
kubectl get pods -A
kubectl get svc -n online-catalog
kubectl describe pod <pod-name> -n online-catalog
kubectl logs <pod-name> -n online-catalog --tail=200
```

4. Check Argo CD sync status and get password:

```bash
kubectl get application -n argocd
kubectl describe application online-catalog -n argocd
kubectl get pods -n argocd

kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo
```

5. Check external endpoints quickly:

```bash
curl -i http://<EC2_PUBLIC_IP>:30081/products
curl -i http://<EC2_PUBLIC_IP>:30082/customers
curl -i http://<EC2_PUBLIC_IP>:30083/orders
```

6. If kubectl is very slow on small EC2 instances, check pressure:

```bash
uptime
free -h
docker stats --no-stream
```

7. Restart workloads after manifest/image changes:

```bash
kubectl rollout restart deployment/catalog-management -n online-catalog
kubectl rollout restart deployment/customer-support -n online-catalog
kubectl rollout restart deployment/order-processing -n online-catalog
kubectl rollout restart deployment/frontend -n online-catalog
```

## Prerequisites

1. Git
2. Docker Desktop (with Docker Compose)
3. Node.js 22+
4. Terraform 1.8+
5. AWS CLI configured with valid credentials
6. WSL2 (Ubuntu recommended) for Ansible execution
7. EC2 key pair in `us-east-1`
8. SSH allowlist CIDR for your current public IP (`x.x.x.x/32`)

## Local Non-Container Run (Optional)

Use this only if you want to run services without Docker:

```powershell
cd online_catalog
npm install --prefix backend/catalog-management
npm install --prefix backend/customer-support
npm install --prefix backend/order-processing
npm install --prefix frontend
.\start-all.ps1
.\stop-all.ps1
```

## Artifact 1 - Docker

### Requirement Mapping

1. Unique Dockerfile per microservice: completed.
2. Automated image build: completed via Docker Compose.

### Command Source

Use `Quickstart Command Playbooks` above for execution commands.

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

### Command Source

Use `Quickstart Command Playbooks` above for execution commands.

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
4. Creates/recreates a single-node kind cluster named `online-catalog`.
5. Configures kind extraPortMappings for NodePort host access on 3000/30081/30082/30083.
6. Pulls/updates the repository and auto-generates missing `.env` files from `.env.example`.
7. Validates Docker Compose configuration (without starting application containers).

### Files Added

1. `infra/ansible/ansible.cfg`
2. `infra/ansible/inventory.example.ini`
3. `infra/ansible/playbooks/site.yml`

### Command Source

Use `Quickstart Command Playbooks` above for execution commands.

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
4. Kubernetes: build+push Docker Hub images, `kubectl apply -k kubernetes`, verify pods/services, validate NodePort URLs.
5. CI/CD: push code to `master`/`main`, verify workflow builds+pushes images, verify Argo CD auto-sync updates cluster.

## Artifact 4 - Kubernetes (kind on EC2)

### Requirement Mapping

1. Service and Deployment manifests exist for all active runtime microservices.
2. Manifests use Docker Hub images (no local-only image dependency).
3. Workloads run on the EC2-hosted kind cluster and are externally reachable by NodePort.

### Files Added

1. `online_catalog/kubernetes/namespace.yaml`
2. `online_catalog/kubernetes/catalog-management.yaml`
3. `online_catalog/kubernetes/customer-support.yaml`
4. `online_catalog/kubernetes/order-processing.yaml`
5. `online_catalog/kubernetes/frontend.yaml`
6. `online_catalog/kubernetes/kustomization.yaml`
7. `online_catalog/scripts/push-images.ps1`

### Command Source

Use `Quickstart Command Playbooks` above for execution commands.

### External Access URLs (from desktop browser)

1. `http://<ec2_public_ip>:3000`
2. `http://<ec2_public_ip>:30081/products`
3. `http://<ec2_public_ip>:30082/customers`
4. `http://<ec2_public_ip>:30083/orders`

### Notes

1. Frontend is configured to call backend APIs via the EC2 public IP NodePort endpoints.
2. If EC2 public IP changes, update frontend manifest env values and redeploy frontend.
3. Terraform security group must allow 3000, 30081, 30082, 30083 inbound.

## Artifact 5 - CI/CD (GitHub Actions + Argo CD)

### Requirement Mapping

1. CI Workflow: on backend/frontend code changes, build images and push to Docker Hub.
2. Manifest Update: CI updates image tags in Kubernetes manifests and pushes changes back to GitHub.
3. CD Sync: Argo CD monitors repository and auto-syncs new manifests into the kind cluster.

### Files Added

1. `.github/workflows/cicd-build-push-and-update-manifests.yml`
2. `online_catalog/argocd/online-catalog-app.yaml`
3. `online_catalog/infra/ansible/playbooks/tasks/setup_argocd.yml`

### Setup Source

Use `Quickstart Command Playbooks` above for first-time setup and repeat-run commands.

This playbook now also:

1. Installs Argo CD in namespace `argocd`.
2. Exposes Argo CD server on `https://<ec2_public_ip>:30443`.
3. Applies Argo CD Application `online-catalog` from repo path `online_catalog/kubernetes`.
4. Enables automated sync with prune + self-heal.

### CI/CD Runtime Flow

1. Developer pushes backend/frontend code to `master` or `main`.
2. GitHub Actions workflow builds and pushes 4 images to Docker Hub with tags:
	1. `latest`
	2. `sha-<full_commit_sha>`
3. Workflow updates Kubernetes image tags to the new `sha-*` tag and commits manifest changes.
4. Argo CD detects the manifest commit and auto-syncs cluster workloads.
5. Updated pods roll out automatically in namespace `online-catalog`.

### Verification Source

Use `Troubleshooting Commands (Copy/Paste)` above for health and sync checks.

## Owner Demo Flow (Laptop)

Use this sequence when you present:

1. Pull latest code from main branch (including collaborator contributions).
2. Run Docker artifact checks locally from your laptop.
3. Run Terraform plan/apply from owner laptop only.
4. Run Ansible checks from owner laptop only.
5. Push container images to Docker Hub and apply Kubernetes manifests on EC2.
6. Show NodePort URLs and API outputs as Artifact 4 evidence.
7. Push a backend code change and show GitHub Actions + Argo CD auto-sync as Artifact 5 evidence.
8. End with cleanup using `terraform destroy`.

This keeps demo execution consistent and avoids concurrent infra changes during presentation.

## Cost Cleanup (Free Tier Safety)

Run this when demo/testing is done:

```powershell
cd online_catalog/infra/terraform
terraform destroy
```

Capture one final screenshot of successful destroy for documentation.
