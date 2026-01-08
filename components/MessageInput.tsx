// src/components/MessageInput.tsx
import React, { useRef, useEffect, useState } from 'react';
import { FiSend, FiPaperclip, FiMic } from 'react-icons/fi';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import '../styles/MessageInput.css';

interface MessageInputProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  onSendMessage: (content: string, files?: File[]) => Promise<void>;
  attachedFiles: File[];
  onAttachFile: (files: FileList) => void;
  onRemoveFile: (index: number) => void;
  isEditing: boolean;
  loading: boolean;
  isAudioMode: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ input, setInput, onSendMessage, attachedFiles, onAttachFile, onRemoveFile, isEditing, loading, isAudioMode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textareaHeight, setTextareaHeight] = useState<number>(60); // Chiều cao ban đầu

  const { transcript, isListening, startListening, stopListening } = useSpeechRecognition();

  // --- CẬP NHẬT: useEffect để xử lý transcript từ speech recognition ---
  useEffect(() => {
    if (!isListening && transcript) {
      setInput(prev => prev + transcript);
    }
  }, [isListening, transcript, setInput]);

  // --- CẬP NHẬT: useEffect để điều chỉnh chiều cao textarea ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset chiều cao
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200); // Giới hạn tối đa
      setTextareaHeight(newHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input, attachedFiles]); // Cập nhật khi nội dung hoặc số lượng file thay đổi

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachedFiles.length > 0) && !loading) {
      onSendMessage(input, attachedFiles);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAttachFile(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const SendIcon = FiSend as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  const PaperclipIcon = FiPaperclip as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  const MicIcon = FiMic as React.ComponentType<React.SVGProps<SVGSVGElement>>;

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      {/* Container cha dùng flex column */}
      <div className="input-and-send-container">
        {/* Row chứa các nút điều khiển và preview file */}
        <div className="input-controls-row-above-textarea">
          {/* Nút đính kèm file */}
          <button
            type="button"
            className={`attach-file-button-inside ${loading ? 'disabled' : ''}`}
            onClick={handleAttachClick}
            disabled={loading}
            title="Đính kèm tệp"
          >
            <PaperclipIcon />
          </button>

          {/* Nút ghi âm */}
          <button
            type="button"
            className={`mic-button-inside ${isListening ? 'listening' : ''} ${loading ? 'disabled' : ''}`}
            onClick={isListening ? stopListening : startListening}
            title={isListening ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
            disabled={loading}
          >
            <MicIcon />
          </button>

          {/* Preview file */}
          {attachedFiles.length > 0 && (
            <div className="attached-files-preview-above-input">
              {attachedFiles.map((file, index) => {
                const isImage = file.type.startsWith('image/');
                const isVideo = file.type.startsWith('video/');

                return (
                  <div key={index} className="attached-file-item">
                    {isImage && (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${file.name}`}
                        className="attached-image-preview-small"
                      />
                    )}
                    {isVideo && (
                      <video
                        src={URL.createObjectURL(file)}
                        controls
                        className="attached-video-preview-small"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                    {!isImage && !isVideo && (
                      <div className="attached-file-info">
                        <span className="attached-file-name">{file.name}</span>
                        <span className="attached-file-size">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="remove-file-button"
                      onClick={() => onRemoveFile(index)}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nút send - đặt ở cuối row */}
          <button 
            type="submit" 
            disabled={loading} 
            className="send-button-inside"
            id="send-message-button"
            >
            <SendIcon />
          </button>
        </div>

        {/* Ô nhập văn bản - nằm dưới row chứa nút điều khiển */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isEditing ? "Chỉnh sửa tin nhắn..." : (isAudioMode ? "Đang ghi âm... Nhập hoặc nói..." : "Type your message here...")}
          disabled={loading}
          className="message-input"
          style={{ resize: 'none', height: `${textareaHeight}px` }}
        />

        {/* Input file ẩn */}
        <input
          id="file-upload-messageinput"
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          ref={fileInputRef}
          disabled={loading}
          multiple
        />
      </div>
    </form>
  );
};

export default MessageInput;