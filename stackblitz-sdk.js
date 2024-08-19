Array.from(document.querySelectorAll('pre.language-js')).forEach(pre => {
  const codeContent = pre?.firstChild?.textContent;
  if (codeContent && codeContent.indexOf('import') >= 0) {
    const script = document.createElement('script');
    Object.assign(script, { textContent: codeContent, type: 'module' });
    document.head.appendChild(script);

    // eslint-disable-next-line no-inner-declarations
    function editOnStackblitz() {
      // eslint-disable-next-line no-console
      console.log('edit on stackblitz ', codeContent);

      const indexHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dynamically Generated Projec</title>
            <script src="https://cdn.jsdelivr.net/npm/@webcomponents/scoped-custom-element-registry@0.0.9/scoped-custom-element-registry.min.js"></script>
        </head>
        <body>
            <dilaog-demo></dilaog-demo>
            <script type="module" src="./index.js"></script>
        </body>
        </html>
        `;

      const packageJson = {
        scripts: {
          start: 'web-dev-server --app-index index.html --node-resolve',
        },
        dependencies: {
          lit: '3.2.0',
          '@lion/ui': '^0.7.6',
          '@open-wc/scoped-elements': '^3.0.5',
          '@web/dev-server-esbuild': '^1.0.2',
          '@webcomponents/scoped-custom-element-registry': '^0.0.9',
        },
        devDependencies: {
          '@web/dev-server': '^0.4.6',
        },
      };

      const litProject = {
        title: 'Lit Generated Project',
        description: 'Simple example using the EngineBlock "javascript" template.',
        template: 'node',
        files: {
          'index.html': indexHtml,
          'index.js': codeContent,
          'package.json': JSON.stringify(packageJson, null, 2),
        },
      };

      // eslint-disable-next-line no-undef
      StackBlitzSDK.openProject(litProject, {
        openFile: 'index.js',
      });
    }

    const button = document.createElement('button');
    Object.assign(button, { textContent: 'Stackblitz' });
    pre?.parentElement?.insertBefore(button, pre);
    button.addEventListener('click', editOnStackblitz);
  }
});
