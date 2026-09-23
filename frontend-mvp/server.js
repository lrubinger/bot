const http=require("http"),fs=require("fs"),path=require("path");
const root=__dirname,port=Number(process.env.MVP_PORT||80);
const types={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".svg":"image/svg+xml"};
http.createServer((req,res)=>{
  let p=req.url.split("?")[0]; if(p==="/")p="/index.html";
  const file=path.join(root,path.normalize(p).replace(/^([.][.][/\\])+/, ""));
  if(!file.startsWith(root)){res.writeHead(403);return res.end("Forbidden")}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end("Not found")}res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","Cache-Control":"no-cache"});res.end(data)});
}).listen(port,"0.0.0.0",()=>console.log("PortoPlan MVP em http://0.0.0.0:"+port));
