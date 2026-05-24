from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
import rembg
import io

app = FastAPI(title="NicoSotoDev IA API")

@app.get("/")
def read_root():
    return {"status": "IA Service Running", "mode": "DevSecOps Optimized"}

@app.post("/remove-background")
async def remove_background(file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado")

    try:
        input_image = await file.read()
        # Aquí procesamos la imagen con rembg
        output_image = rembg.remove(input_image)
        return Response(content=output_image, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")