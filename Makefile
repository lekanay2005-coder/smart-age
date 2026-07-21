# Convenience tasks for SmartAge.
# Usage: make <target>

NETWORK ?= futurenet

.PHONY: help
help:
	@echo "SmartAge Makefile targets:"
	@echo "  make build-contract   Build the Soroban wasm contract"
	@echo "  make test-contracts   Run contract unit tests"
	@echo "  make test             Run all tests (contract + frontend)"
	@echo "  make frontend-install Install frontend deps"
	@echo "  make dev              Run the frontend dev server"
	@echo "  make build-frontend   Production build of the frontend"
	@echo "  make deploy           Deploy contract (NETWORK=futurenet|testnet)"
	@echo "  make invoke           Interactive invoke helper"
	@echo "  make fmt              Format contracts"

.PHONY: build-contract
build-contract:
	cd contracts && cargo build --target wasm32v1-none --release

.PHONY: test-contracts
test-contracts:
	cd contracts && cargo test

.PHONY: test
test:
	./scripts/test.sh

.PHONY: frontend-install
frontend-install:
	cd frontend && npm install

.PHONY: dev
dev:
	cd frontend && npm run dev

.PHONY: build-frontend
build-frontend:
	cd frontend && npm run build

.PHONY: deploy
deploy:
	NETWORK=$(NETWORK) ./scripts/deploy.sh

.PHONY: invoke
invoke:
	@read -p "Contract id: " id; \
	 read -p "Method (create/release/refund/get/list): " method; \
	 stellar contract invoke --id "$$id" --network $(NETWORK) --source "$(STELLAR_ACCOUNT)" -- $$method

.PHONY: fmt
fmt:
	cd contracts && cargo fmt
