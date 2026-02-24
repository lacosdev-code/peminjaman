import ImageKit from "imagekit-javascript";

const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!;
const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;
const authenticationEndpoint = "/api/imagekit-auth";

const imagekit = new ImageKit({
    publicKey,
    urlEndpoint,
});

export interface UploadResponse {
    url: string;
    fileId: string;
    name: string;
}

/**
 * Uploads a base64 image string to ImageKit.
 * @param base64Image The base64 string of the image (with or without data URI prefix)
 * @param fileName Desired name for the file
 */
export async function uploadToImageKit(base64Image: string, fileName: string): Promise<UploadResponse | null> {
    try {
        return new Promise((resolve, reject) => {
            imagekit.upload(
                {
                    file: base64Image,
                    fileName: fileName,
                    useUniqueFileName: true,
                    folder: "/peminjaman-teknisi",
                    signature: "",
                    token: "",
                    expire: 0,
                },
                function (err, result) {
                    if (err) {
                        console.error("ImageKit Upload Error:", err);
                        resolve(null);
                    } else {
                        resolve({
                            url: result!.url,
                            fileId: result!.fileId,
                            name: result!.name,
                        });
                    }
                }
            );
        });
    } catch (error) {
        console.error("ImageKit unexpected error:", error);
        return null;
    }
}
