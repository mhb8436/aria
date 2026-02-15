.PHONY: build bundle test lint typecheck clean install dev scan crawl package gen-axe bun-build

install:
	npm install

build:
	npx tsc

gen-axe:
	@node -e "\
		const fs = require('fs'); \
		const axePath = require.resolve('axe-core/axe.min.js'); \
		const src = fs.readFileSync(axePath, 'utf-8'); \
		fs.writeFileSync('src/core/axe-embedded.ts', 'export const AXE_SOURCE = ' + JSON.stringify(src) + ';\n'); \
		console.log('Generated axe-embedded.ts');"

bundle: gen-axe
	npx esbuild src/cli/index.ts \
		--bundle \
		--platform=node \
		--target=node20 \
		--format=cjs \
		--outfile=dist/aria.cjs \
		--external:puppeteer-core \
		--external:sql.js \
		--external:exceljs
	@echo "Bundle: dist/aria.cjs ($(du -h dist/aria.cjs | cut -f1))"

bun-build: gen-axe
	bun build src/cli/index.ts \
		--compile \
		--minify \
		--target=bun \
		--outfile=dist/aria
	@echo "Binary: dist/aria ($(du -h dist/aria | cut -f1))"
	@echo "Usage: ./dist/aria scan <url>"

package: bundle
	mkdir -p dist/aria-package
	cp dist/aria.cjs dist/aria-package/
	cp scripts/aria.sh dist/aria-package/aria
	cp package.json dist/aria-package/
	cd dist/aria-package && npm install --omit=dev --ignore-scripts 2>/dev/null
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
	rm -rf dist coverage *.db src/core/axe-embedded.ts
