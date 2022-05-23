//Most basic JS esbuild settings

let entryPoint = 'src/app.js'

const fs = require('fs');

console.time('esbuild')

require('esbuild').build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: 'dist/app.js',
    target: "es2020",
    loader: {
			'.html': 'text'
		},
		minify: true,
		sourcemap: true,
  }).then((res) => {
    
    let data = fs.readFileSync('dist/app.js').toString();

    fs.writeFileSync(
      'dist/index.html',`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body style="background-color:#101010;">
          <script>
            ${data}
          </script>
          </body>
        </html>
      `
    );

    console.timeEnd('esbuild');
    //console.log(data);
    // for(let out of res.outputFiles) {
    //   console.log(out.path, out.contents);
    // }
  }).catch(() => process.exit(1))


//ESBuild instructions:
//https://esbuild.github.io/getting-started/#your-first-bundle
//Natively builds react, ts, etc. with added specification.
