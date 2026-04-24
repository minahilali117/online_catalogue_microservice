terraform {
  backend "s3" {
    bucket           = "online-catalog-tf-state-186072212411"
    key              = "prod/terraform.tfstate"
    region           = "us-east-1"
    dynamodb_table   = "terraform-locks"
    encrypt          = true
  }
}