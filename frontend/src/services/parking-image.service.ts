import { api } from './api';

export const parkingImageService = {
  async updateParkingImage(parkingLotId: string, imageFile: File): Promise<{ url: string ,message: string }> {
    
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await api.patch(`/parking-lots/${parkingLotId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
};