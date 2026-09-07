import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";

const REQUIRED_ENV = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL_BASE"] as const;

//Lazily built on first use, not at import time - R2 isn't needed for most of the API (only
//level upload touches it), so a dev machine without R2 configured can still run everything else.
let state : {client : S3Client, bucket : string, publicUrlBase : string} | null = null;

function GetState() {
    if (state) return state;

    for (const key of REQUIRED_ENV) {
        if (!process.env[key]) throw new Error(`${key} is not set - see CLAUDE.md's Running it section`);
    }

    //R2 is S3-API-compatible - same client, just pointed at Cloudflare's endpoint instead of AWS's.
    const client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
    });
    state = {
        client,
        bucket: process.env.R2_BUCKET_NAME!,
        //No trailing slash, so callers can always do `${publicUrlBase}/${key}`.
        publicUrlBase: process.env.R2_PUBLIC_URL_BASE!.replace(/\/+$/, ""),
    };
    return state;
}

//Uploads one object and returns its public URL - the bucket is public-read (see CLAUDE.md), so
//no signed URL is needed for callers to actually use what this returns.
export async function UploadToR2(key : string, body : Buffer, contentType : string) : Promise<string> {
    const {client, bucket, publicUrlBase} = GetState();
    await client.send(new PutObjectCommand({Bucket: bucket, Key: key, Body: body, ContentType: contentType}));
    return `${publicUrlBase}/${key}`;
}
