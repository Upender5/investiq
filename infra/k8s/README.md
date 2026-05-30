# InvestIQ — Kubernetes Deployment (AWS EKS, ap-south-1)

## Prerequisites
- AWS CLI configured (`aws configure`)
- `kubectl` installed
- `eksctl` installed
- `helm` v3+
- Docker + ECR access

---

## 1. Create EKS Cluster

```bash
eksctl create cluster \
  --name investiq-prod \
  --region ap-south-1 \
  --nodegroup-name standard \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 6 \
  --managed
```

## 2. Install AWS Load Balancer Controller

```bash
# Add EKS chart repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=investiq-prod \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

## 3. Configure ECR & Push Images

```bash
# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

# Create repos (one-time)
for svc in auth-service user-service trade-service wallet-service \
           market-data-service notification-service ai-advisor \
           ml-scoring-service analytics-service background-jobs; do
  aws ecr create-repository --repository-name investiq/$svc --region ap-south-1
done

# Build & push (from project root)
docker compose build
for svc in auth-service trade-service notification-service market-data-service; do
  docker tag investiq-$svc:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/investiq/$svc:latest
  docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/investiq/$svc:latest
done
```

## 4. Fill Secrets

Edit `secrets/app-secrets.yaml` and replace all `<base64-encoded-placeholder>` values:

```bash
# Encode a value
echo -n "your-actual-value" | base64
```

**Never commit real secrets to git.** Use AWS Secrets Manager + External Secrets Operator in production.

## 5. Apply Manifests (in order)

```bash
kubectl apply -f namespace.yaml
kubectl apply -f secrets/app-secrets.yaml
kubectl apply -f configmaps/app-config.yaml
kubectl apply -f deployments/
kubectl apply -f services/
kubectl apply -f ingress/
kubectl apply -f hpa/
```

## 6. Verify

```bash
# All pods running
kubectl get pods -n investiq

# Services
kubectl get svc -n investiq

# Ingress (get ALB DNS)
kubectl get ingress -n investiq

# Check a specific service
kubectl logs -n investiq deployment/auth-service --tail=50
kubectl rollout status deployment/auth-service -n investiq
```

## 7. Update a Service

```bash
# Build new image
docker build -t investiq/auth-service:latest services/auth-service/
docker tag investiq/auth-service:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/investiq/auth-service:v2
docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/investiq/auth-service:v2

# Update deployment image
kubectl set image deployment/auth-service auth-service=<AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/investiq/auth-service:v2 -n investiq

# Or force re-pull of :latest
kubectl rollout restart deployment/auth-service -n investiq
```

## 8. Managed Services (not in K8s)

| Service     | AWS Managed          | Notes                            |
|-------------|----------------------|----------------------------------|
| PostgreSQL  | RDS (db.t3.medium)   | Multi-AZ for prod                |
| Redis       | ElastiCache          | Single node dev, cluster prod    |
| Kafka       | MSK                  | 3 brokers, ap-south-1a/b/c       |
| MongoDB     | Atlas M10            | India region cluster             |

## Port Map

| Service              | Port |
|----------------------|------|
| auth-service         | 8081 |
| user-service         | 8082 |
| trade-service        | 8083 |
| wallet-service       | 8084 |
| market-data-service  | 8085 |
| notification-service | 8086 |
| ai-advisor           | 9001 |
| ml-scoring-service   | 9002 |
| analytics-service    | 9003 |
| background-jobs      | 9004 |
