import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthed } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "product-images";

export async function POST(req: NextRequest) {
  if (!(await isAdminRequestAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No image files selected." }, { status: 400 });
    }

    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    if (bucketsError) throw bucketsError;

    if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
      const { error: createBucketError } = await supabaseAdmin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: "10MB",
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      });
      if (createBucketError && !/already exists/i.test(createBucketError.message)) {
        throw createBucketError;
      }
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: `${file.name} is not an image.` }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `${file.name} is larger than 10MB.` }, { status: 400 });
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `products/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

      if (error) throw error;

      const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    return NextResponse.json({ urls: uploadedUrls });
  } catch (error) {
    console.error("Product image upload error:", error);
    return NextResponse.json({ error: "Failed to upload product images." }, { status: 500 });
  }
}
