import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

interface UploadResult {
  success: boolean;
  objectPath?: string;
  error?: string;
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickImage = useCallback(async (): Promise<string | null> => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return result.assets[0].uri;
  }, []);

  const uploadImage = useCallback(async (imageUri: string): Promise<UploadResult> => {
    setIsUploading(true);
    setProgress(0);

    try {
      const apiUrl = getApiUrl();
      
      const filename = imageUri.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      setProgress(10);

      const requestUrlResponse = await fetch(`${apiUrl}/api/uploads/request-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: filename,
          size: 0,
          contentType: type,
        }),
      });

      if (!requestUrlResponse.ok) {
        throw new Error("Impossible d'obtenir l'URL d'upload");
      }

      const { uploadURL, objectPath } = await requestUrlResponse.json();

      setProgress(30);

      let blob: Blob;
      if (Platform.OS === "web") {
        const response = await fetch(imageUri);
        blob = await response.blob();
      } else {
        const response = await fetch(imageUri);
        blob = await response.blob();
      }

      setProgress(50);

      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Erreur lors de l'upload");
      }

      setProgress(100);

      const fullPhotoUrl = `${apiUrl}${objectPath}`;

      return { success: true, objectPath: fullPhotoUrl };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setIsUploading(false);
    }
  }, []);

  const pickAndUpload = useCallback(async (): Promise<UploadResult> => {
    const imageUri = await pickImage();
    if (!imageUri) {
      return { success: false, error: "Aucune image sélectionnée" };
    }
    return uploadImage(imageUri);
  }, [pickImage, uploadImage]);

  return {
    pickImage,
    uploadImage,
    pickAndUpload,
    isUploading,
    progress,
  };
}
