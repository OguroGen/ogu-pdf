/* Classic worker: qpdf.js is an Emscripten UMD build and must not be bundled by Vite. */
importScripts("./qpdf.js");

self.onmessage = async (event) => {
  const { id, pdfBytes, password } = event.data;
  const stderr = [];

  try {
    const qpdf = await Module({
      locateFile: (file) => `./${file}`,
      print: () => {},
      printErr: (msg) => {
        stderr.push(String(msg));
      },
    });

    qpdf.FS.writeFile("/input.pdf", new Uint8Array(pdfBytes));

    const args = password
      ? ["--password=" + password, "/input.pdf", "--decrypt", "/output.pdf"]
      : ["/input.pdf", "--decrypt", "/output.pdf"];

    let code = 0;
    try {
      code = qpdf.callMain(args);
    } catch (err) {
      if (err && err.name === "ExitStatus") {
        code = err.status;
      } else {
        throw err;
      }
    }

    if (code !== 0) {
      const hint = stderr.join("\n");
      const passwordFailed = /password|encrypt/i.test(hint);
      self.postMessage({
        id,
        error: passwordFailed
          ? "復号に失敗しました。パスワードが違う可能性があります。"
          : "PDFの復号に失敗しました。",
      });
      return;
    }

    const output = qpdf.FS.readFile("/output.pdf");
    self.postMessage({ id, data: output }, [output.buffer]);
  } catch (err) {
    self.postMessage({
      id,
      error: err && err.message ? String(err.message) : "PDFの復号に失敗しました。",
    });
  }
};
