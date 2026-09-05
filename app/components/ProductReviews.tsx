'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Image from 'next/image';
import Pagination from './Pagination';

const REVIEWS_PAGE_SIZE = 10;

interface Review {
  id: string;
  name: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  productImage?: string;
  images?: string[];
  videoUrl?: string;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
  productImage?: string;
}

interface ReviewApiResponse {
  id: string;
  userName: string;
  rating: number;
  createdAt: string;
  comment: string;
  images?: unknown;
  videoUrl?: string | null;
  isVerifiedPurchase: boolean;
}

export default function ProductReviews({ productId, productName, productImage }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  
  // Form state
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    images: '',
    videoUrl: ''
  });

  const fetchReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/products/${productId}/reviews`);
      const data = await response.json();
      if (data.success) {
        // Map API response to local Review interface
        const mappedReviews = data.reviews.map((r: ReviewApiResponse) => ({
          id: r.id,
          name: r.userName,
          rating: r.rating,
          date: new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          comment: r.comment,
          verified: r.isVerifiedPurchase,
          productImage,
          images: Array.isArray(r.images) ? r.images : [],
          videoUrl: r.videoUrl || undefined
        }));
        setReviews(mappedReviews);
        setPage(1);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [productId, productImage]);

  useEffect(() => {
    // Fetching remote reviews is the external synchronization performed here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchReviews();
  }, [fetchReviews]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'rating' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: formData.rating,
          comment: formData.comment,
          images: formData.images.split(',').map(img => img.trim()).filter(Boolean),
          videoUrl: formData.videoUrl.trim() || null
        })
      });

      const data = await response.json();
      if (data.success) {
        setSubmitStatus({ type: 'success', message: data.message || 'Your review is waiting for moderation.' });
        setFormData({ rating: 5, comment: '', images: '', videoUrl: '' });
        fetchReviews();
      } else {
        throw new Error(data.error || 'Failed to submit review');
      }
    } catch (error) {
      setSubmitStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to submit review. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const ratingCounts = [5, 4, 3, 2, 1].map(rating => 
    reviews.filter(r => r.rating === rating).length
  );
  const totalPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedReviews = reviews.slice(
    (currentPage - 1) * REVIEWS_PAGE_SIZE,
    currentPage * REVIEWS_PAGE_SIZE,
  );

  return (
    <section className="mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
        <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Customer Reviews
        </span>
        <span className="sr-only"> for {productName}</span>
      </h2>

      {/* Rating Summary */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-center md:text-left">
              <div className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                {reviews.length > 0 ? averageRating.toFixed(1) : '0.0'}
              </div>
              <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-6 h-6 ${
                      star <= Math.round(averageRating || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 text-lg">
                Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingCounts[5 - rating];
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-8">{rating}</span>
                    <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Write a Review Form */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <h3 className="text-2xl font-bold mb-6 text-gray-900 text-center md:text-left">Write a Review</h3>
          <p className="mb-6 text-sm text-gray-500">Sign in with a verified customer account to submit one review per product. Reviews appear after admin approval.</p>
          
          {submitStatus.type !== 'idle' && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
              submitStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {submitStatus.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Rating *</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${star} out of 5 stars`}
                    aria-pressed={formData.rating === star}
                    onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                    className="focus:outline-none transition-transform active:scale-110"
                  >
                    <svg
                      className={`w-8 h-8 ${
                        star <= formData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Your Review *</label>
              <textarea
                name="comment"
                required
                minLength={20}
                maxLength={2000}
                value={formData.comment}
                onChange={handleInputChange}
                rows={4}
                placeholder="Share your experience with this product (e.g., How did it feel? What results did you see?)"
                className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all hover:border-gray-300 resize-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Photo URLs (Comma separated)</label>
                <input
                  type="text"
                  name="images"
                  value={formData.images}
                  onChange={handleInputChange}
                  placeholder="url1.jpg, url2.jpg"
                  className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all hover:border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Video URL (Optional)</label>
                <input
                  type="text"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleInputChange}
                  placeholder="YouTube or direct video link"
                  className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all hover:border-gray-300"
                />
              </div>
            </div>

            <div className="flex justify-center md:justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Post review'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Reviews List */}
      <div className="max-w-4xl mx-auto space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
            No reviews yet. Be the first to review this product!
          </div>
        ) : (
          <>
          {paginatedReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100"
            >
              <div className="flex items-start gap-4">
                {/* Review Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{review.name}</h4>
                    {review.verified && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified Purchase
                      </span>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">{review.date}</span>
                  </div>

                  {/* Comment */}
                  <p className="text-gray-700 leading-relaxed">{review.comment}</p>

                  {/* Shared Media */}
                  {(review.images && review.images.length > 0) || review.videoUrl ? (
                    <div className="mt-6 flex flex-wrap gap-3">
                      {review.images?.map((img, idx) => (
                        <div key={idx} className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm transition-transform hover:scale-105 cursor-zoom-in">
                          <Image
                            src={img || '/logo_main.png'}
                            alt="User upload"
                            width={100}
                            height={100}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {review.videoUrl && (
                        <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-100 bg-black relative group cursor-pointer">
                           {review.videoUrl.includes('youtube.com') || review.videoUrl.includes('youtu.be') ? (
                             <div className="w-full h-full flex items-center justify-center">
                               <svg className="w-8 h-8 text-white z-10" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                               <Image 
                                 src={`https://img.youtube.com/vi/${review.videoUrl.split('/').pop()?.split('=')[1] || review.videoUrl.split('/').pop()}/mqdefault.jpg`}
                                 alt="Video"
                                 fill
                                 className="object-cover opacity-50"
                                 unoptimized
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                             </div>
                           ) : (
                             <video src={review.videoUrl} className="w-full h-full object-cover opacity-60" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                           )}
                           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <svg className="w-6 h-6 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                           </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          <Pagination page={currentPage} pageSize={REVIEWS_PAGE_SIZE} totalItems={reviews.length} itemLabel="reviews" onPageChange={setPage} />
          </>
        )}
      </div>
    </section>
  );
}
