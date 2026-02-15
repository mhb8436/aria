.PHONY: build bundle test lint typecheck clean install dev scan crawl package

install:
	npm install
	npx playwright install chromium

build:
	npx tsc

bundle:
	npx esbuild src/cli/index.ts \
		--bundle \
		--platform=node \
		--target=node20 \
		--format=cjs \
		--outfile=dist/aria.cjs \
		--external:playwright \
		--external:better-sqlite3 \
		--external:exceljs
	@echo "Bundle: dist/aria.cjs ($(du -h dist/aria.cjs | cut -f1))"

package: bundle
	mkdir -p dist/aria-package
	cp dist/aria.cjs dist/aria-package/
	cp scripts/aria.sh dist/aria-package/aria
	cp package.json dist/aria-package/
	cd dist/aria-package && npm install --omit=dev --ignore-scripts 2>/dev/null && \
		npx playwright install chromium
	@echo "Package ready: dist/aria-package/"
	@echo "Usage: dist/aria-package/aria scan <url>"

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
