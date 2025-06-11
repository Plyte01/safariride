"use client";

import { useEffect, useState, FormEvent } from 'react';
import { FAQ as PrismaFAQ } from '@prisma/client'; // Your Prisma FAQ type
import { FiPlus, FiEdit2, FiTrash2, FiAlertTriangle } from 'react-icons/fi';

// FAQ Form Component (can be inline or separate)
const FAQForm = ({ initialData, onSubmit, onCancel, isSubmitting }: {
  initialData?: Partial<PrismaFAQ>;
  onSubmit: (data: Partial<PrismaFAQ>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}) => {
  const [question, setQuestion] = useState(initialData?.question || '');
  const [answer, setAnswer] = useState(initialData?.answer || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [isActive, setIsActive] = useState(initialData?.isActive === undefined ? true : initialData.isActive);
  const [sortOrder, setSortOrder] = useState<string>(initialData?.sortOrder?.toString() || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
        alert("Question and Answer cannot be empty.");
        return;
    }
    onSubmit({ question, answer, category: category.trim() || null, isActive, sortOrder: sortOrder ? parseInt(sortOrder) : null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-md bg-slate-50 mb-6">
      <div>
        <label htmlFor="question" className="label-form">Question <span className="text-red-500">*</span></label>
        <textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} required rows={2} className="input-form w-full" />
      </div>
      <div>
        <label htmlFor="answer" className="label-form">Answer <span className="text-red-500">*</span></label>
        <textarea id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} required rows={4} className="input-form w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (e.g., General)" className="input-form"/>
        <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="Sort Order (Optional)" className="input-form"/>
        <label className="flex items-center space-x-2 cursor-pointer col-span-1 md:col-auto">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="form-checkbox" />
            <span>Active</span>
        </label>
      </div>
      <div className="flex justify-end space-x-3">
        <button type="button" onClick={onCancel} className="btn-secondary py-2 px-4 text-sm">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary py-2 px-4 text-sm disabled:opacity-50">
          {isSubmitting ? (initialData?.id ? 'Saving...' : 'Adding...') : (initialData?.id ? 'Save Changes' : 'Add FAQ')}
        </button>
      </div>
    </form>
  );
};


export default function AdminFAQsPage() {
  const [faqs, setFaqs] = useState<PrismaFAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<PrismaFAQ | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFAQs = async () => {
    setIsLoading(true); setError(null);
    try {
      const response = await fetch('/api/admin/faqs');
      if (!response.ok) throw new Error('Failed to fetch FAQs.');
      setFaqs(await response.json());
    } catch (err: unknown) { 
      const message = err instanceof Error ? err.message : String(err);
      setError(message); 
    }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchFAQs(); }, []);

  const handleFormSubmit = async (data: Partial<PrismaFAQ>) => {
    setIsSubmitting(true);
    const url = editingFAQ ? `/api/admin/faqs/${editingFAQ.id}` : '/api/admin/faqs';
    const method = editingFAQ ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Failed to ${editingFAQ ? 'update' : 'create'} FAQ.`);
      fetchFAQs(); // Re-fetch to show updated list
      setShowForm(false);
      setEditingFAQ(null);
      alert(`FAQ ${editingFAQ ? 'updated' : 'added'} successfully!`);
    } catch (err: unknown) { 
      const message = err instanceof Error ? err.message : String(err);
      setError(message); 
      alert(`Error: ${message}`);
    }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteFAQ = async (faqId: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      const response = await fetch(`/api/admin/faqs/${faqId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json().catch(()=>({message: "Failed to delete FAQ"}));
        throw new Error(errData.message);
      }
      fetchFAQs();
      alert("FAQ deleted successfully.");
    } catch (err: unknown) { 
      const message = err instanceof Error ? err.message : String(err);
      setError(message); 
      alert(`Error: ${message}`);
    }
  };

  if (isLoading) return <div className="text-center py-10">Loading FAQs...</div>;
  // Add error display as in other admin pages

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">Manage FAQs</h1>
        {!showForm && (
            <button onClick={() => { setEditingFAQ(null); setShowForm(true); }} className="btn-primary py-2 px-4 text-sm flex items-center">
                <FiPlus className="mr-1.5 h-4 w-4"/> Add New FAQ
            </button>
        )}
      </div>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm flex items-center"><FiAlertTriangle className="mr-2"/>{error}</div>}

      {showForm && (
        <FAQForm
          initialData={editingFAQ || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => { setShowForm(false); setEditingFAQ(null); }}
          isSubmitting={isSubmitting}
        />
      )}

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {faqs.length === 0 && !isLoading && <p className="text-center text-gray-500 py-10">No FAQs found. Add one to get started!</p>}
        {faqs.length > 0 && (
            <ul className="divide-y divide-gray-200">
                {faqs.map((faq) => (
                    <li key={faq.id} className="p-4 hover:bg-slate-50">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-md font-semibold text-gray-800">{faq.question}</h3>
                                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{faq.answer}</p>
                                <div className="text-xs text-gray-400 mt-2">
                                    Category: {faq.category || 'N/A'} | 
                                    Status: {faq.isActive ? <span className="text-green-600">Active</span> : <span className="text-red-600">Inactive</span>} | 
                                    Order: {faq.sortOrder ?? 'N/A'}
                                </div>
                            </div>
                            <div className="flex-shrink-0 ml-4 space-x-2">
                                <button onClick={() => { setEditingFAQ(faq); setShowForm(true); }} className="action-icon text-indigo-600" title="Edit FAQ"><FiEdit2/></button>
                                <button onClick={() => handleDeleteFAQ(faq.id)} className="action-icon text-red-600" title="Delete FAQ"><FiTrash2/></button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        )}
      </div>
    </div>
  );
}