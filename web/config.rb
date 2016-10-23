# General configuration

# Reload the browser automatically whenever files change
configure :development do
  activate :livereload
end

# Build-specific configuration
configure :build do
  ignore 'javascripts/index.js'
  ignore 'javascripts/*.map'

  activate :minify_html, remove_intertag_spaces: true
  activate :asset_hash
end

activate :external_pipeline,
         name: :webpack,
         command: build? ?
         "NODE_ENV=production ./node_modules/webpack/bin/webpack.js --progress --color" :
         "./node_modules/webpack/bin/webpack.js --watch -d --progress --color",
         source: ".tmp/dist",
         latency: 1
