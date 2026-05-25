import os
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
import rembg

app = FastAPI(title="NicoSotoDev IA API")
session = rembg.new_session("u2netp")

@app.get("/")
def read_root():
    return {"status": "IA Service Running", "mode": "DevSecOps Optimized"}

@app.post("/remove-background")
async def remove_background(file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado")

    try:
        input_image = await file.read()
        output_image = rembg.remove(input_image, session=session)
        return Response(content=output_image, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("app:app", host="0.0.0.0", port=port)