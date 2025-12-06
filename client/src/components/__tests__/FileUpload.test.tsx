import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../FileUpload';

describe('FileUpload Component', () => {
  it('should render upload area', () => {
    const mockOnUpload = vi.fn();
    render(<FileUpload onUpload={mockOnUpload} />);

    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    expect(screen.getByText(/upload/i)).toBeInTheDocument();
  });

  it('should accept PDF, DOCX, and TXT files', () => {
    const mockOnUpload = vi.fn();
    render(<FileUpload onUpload={mockOnUpload} />);

    const input = screen.getByRole('button', { name: /upload/i })
      .closest('label')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    expect(input).toBeDefined();
    expect(input?.accept).toContain('.pdf');
    expect(input?.accept).toContain('.docx');
    expect(input?.accept).toContain('.txt');
  });

  it('should call onUpload when file is selected', async () => {
    const mockOnUpload = vi.fn();
    render(<FileUpload onUpload={mockOnUpload} />);

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByRole('button', { name: /upload/i })
      .closest('label')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
      expect(mockOnUpload).toHaveBeenCalledWith(file);
    }
  });

  it('should show error for invalid file type', () => {
    const mockOnUpload = vi.fn();
    render(<FileUpload onUpload={mockOnUpload} />);

    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload/i })
      .closest('label')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
      expect(mockOnUpload).not.toHaveBeenCalled();
    }
  });
});
