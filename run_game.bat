@echo off
echo Dang khoi dong Local Web Server cho game KA Survival...
echo Ban hay mo trinh duyet va truy cap: http://localhost:8080/
powershell -Command "$code = @'
using System;
using System.Net;
using System.IO;

public class TinyServer {
    public static void Start() {
        HttpListener listener = new HttpListener();
        listener.Prefixes.Add(\"http://localhost:8080/\");
        listener.Start();
        Console.WriteLine(\"Server running at http://localhost:8080/\");
        while (true) {
            HttpListenerContext context = listener.GetContext();
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;
            
            string rawPath = request.Url.LocalPath.TrimStart('/');
            if (string.IsNullOrEmpty(rawPath)) rawPath = \"index.html\";
            string filePath = Path.Combine(\"c:\\grinfs\\KA\", rawPath.Replace('/', '\\\\'));
            
            if (File.Exists(filePath)) {
                byte[] buffer = File.ReadAllBytes(filePath);
                response.ContentLength64 = buffer.Length;
                string ext = Path.GetExtension(filePath).ToLower();
                if (ext == \".html\") response.ContentType = \"text/html\";
                else if (ext == \".js\") response.ContentType = \"application/javascript\";
                else if (ext == \".css\") response.ContentType = \"text/css\";
                else if (ext == \".glb\" || ext == \".gltf\") response.ContentType = \"model/gltf-binary\";
                else if (ext == \".png\") response.ContentType = \"image/png\";
                else if (ext == \".jpg\" || ext == \".jpeg\") response.ContentType = \"image/jpeg\";
                
                response.OutputStream.Write(buffer, 0, buffer.Length);
            } else {
                response.StatusCode = 404;
            }
            response.OutputStream.Close();
        }
    }
}
'@; Add-Type -TypeDefinition $code; [TinyServer]::Start()"
pause
