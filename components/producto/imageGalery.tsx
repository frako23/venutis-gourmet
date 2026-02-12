"use client";

import { Imagen } from "@prisma/client";
import Image from "next/image";
import { useState } from "react";

export const ImageGalery = ({ images }: { images: Imagen[] }) => {
  const [mainImage, setMainImage] = useState(images[0].url);
  return (
    <div className="lg:col-span-7 space-y-4">
      <div className="aspect-[1/1] rounded-xl overflow-hidden bg-surface-dark group relative cursor-zoom-in">
        <Image
          width={800}
          height={1000}
          alt="Aged Balsamic Vinegar"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          src={mainImage || "/food-avatar.png"}
        />
        {/* <div className="absolute top-4 left-4 px-3 py-1 bg-primary/90 text-white text-[10px] font-bold uppercase tracking-widest rounded">
                Best Seller
              </div> */}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {images.map((img, i) => (
            <div
              key={i}
              className={`aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${img.url === mainImage ? "border-2 border-gold" : "hover:opacity-80"}`}
              onClick={() => setMainImage(img.url)}
            >
              <Image
                width={200}
                height={200}
                className="w-full h-full object-cover"
                src={img.url || "/food-avatar.png"}
                alt="Gallery thumbnail"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
