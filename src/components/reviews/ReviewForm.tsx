import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { FiStar, FiImage, FiX } from 'react-icons/fi';
import Image from 'next/image';

interface ReviewCategory {
  name: string;
  rating: number;
}

interface ReviewFormProps {
  carId: string;
  bookingId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (review: any) => void;
  onCancel: () => void;
}

const categories: ReviewCategory[] = [
  { name: 'Overall Experience', rating: 0 },
  { name: 'Cleanliness', rating: 0 },
  { name: 'Condition', rating: 0 },
  { name: 'Communication', rating: 0 },
  { name: 'Value for Money', rating: 0 },
];

export default function ReviewForm({ carId, bookingId, onSubmit, onCancel }: ReviewFormProps) {
  const { data: session } = useSession();
  const [comment, setComment] = useState('');
  const [ratings, setRatings] = useState<ReviewCategory[]>(categories);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (categoryName: string, rating: number) => {
    setRatings(ratings.map(cat => 
      cat.name === categoryName ? { ...cat, rating } : cat
    ));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 5) {
      alert('Maximum 5 photos allowed');
      return;
    }

    setPhotos([...photos, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews([...previews, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    setIsSubmitting(true);
    try {
      // Upload photos first
      const photoUrls = await Promise.all(
        photos.map(async (photo) => {
          const formData = new FormData();
          formData.append('file', photo);
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          return data.url;
        })
      );

      // Calculate average rating
      const averageRating = ratings.reduce((acc, cat) => acc + cat.rating, 0) / ratings.length;

      // Submit review
      const reviewData = {
        carId,
        bookingId,
        comment,
        ratings,
        averageRating,
        photos: photoUrls,
      };

      onSubmit(reviewData);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rating Categories */}
      <div className="space-y-4">
        {ratings.map((category) => (
          <div key={category.name} className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{category.name}</span>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRatingChange(category.name, rating)}
                  className="focus:outline-none"
                >
                  <FiStar
                    className={`h-6 w-6 ${
                      rating <= category.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
          Your Review
        </label>
        <textarea
          id="comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Share your experience with this car..."
        />
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Photos (Optional)</label>
        <div className="mt-2 flex items-center space-x-4">
          <button
            type="button"
            onClick={() => document.getElementById('photo-upload')?.click()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiImage className="h-5 w-5 mr-2" />
            Add Photos
          </button>
          <input
            type="file"
            id="photo-upload"
            className="hidden"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
          />
          <span className="text-sm text-gray-500">
            {photos.length}/5 photos
          </span>
        </div>

        {/* Photo Previews */}
        {previews.length > 0 && (
          <div className="mt-4 grid grid-cols-5 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative">
                <Image
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  width={100}
                  height={100}
                  className="rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
} 