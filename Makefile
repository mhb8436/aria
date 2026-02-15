.PHONY: build test lint typecheck clean install dev scan crawl

install:
	npm install
	npx playwright install chromium

build:
	npx tsc

dev:
	npx tsx src/cli/index.ts $(ARGS)

scan:
	npx tsx src/cli/index.ts scan $(URL) $(ARGS)

crawl:
	npx tsx src/cli/index.ts crawl $(URL) $(ARGS)

test:
	npx vitest run

test-watch:
	npx vitest

test-e2e:
	npx vitest run --config vitest.e2e.config.ts

lint:
	npx eslint src/ test/ --ext .ts

lint-fix:
	npx eslint src/ test/ --ext .ts --fix

typecheck:
	npx tsc --noEmit

clean:
	rm -rf dist coverage *.db
