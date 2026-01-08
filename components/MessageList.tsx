// src/components/MessageList.tsx
import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { Message, Attachment } from '../models/ChatModels';
import { FiCopy } from 'react-icons/fi';
import DOMPurify from 'dompurify';
import '../styles/MessageList.css';
// --- Import SyntaxHighlighter từ light-loader ---
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
// Import các ngôn ngữ
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml'; // HTML/XML
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust';
import swift from 'react-syntax-highlighter/dist/esm/languages/hljs/swift';
import kotlin from 'react-syntax-highlighter/dist/esm/languages/hljs/kotlin';
import ruby from 'react-syntax-highlighter/dist/esm/languages/hljs/ruby';
import php from 'react-syntax-highlighter/dist/esm/languages/hljs/php';

// --- Import katex ---
import katex from 'katex';
import 'katex/dist/katex.min.css';

// --- Ép kiểu và đăng ký ngôn ngữ ---
// Ép SyntaxHighlighter sang unknown, sau đó sang any để truy cập registerLanguage
const TypedSyntaxHighlighter = SyntaxHighlighter as unknown as any;

// Kiểm tra và đăng ký ngôn ngữ
if (TypedSyntaxHighlighter && typeof TypedSyntaxHighlighter.registerLanguage === 'function') {
  TypedSyntaxHighlighter.registerLanguage('cpp', cpp);
  TypedSyntaxHighlighter.registerLanguage('python', python);
  TypedSyntaxHighlighter.registerLanguage('javascript', javascript);
  TypedSyntaxHighlighter.registerLanguage('js', javascript);
  TypedSyntaxHighlighter.registerLanguage('sql', sql);
  TypedSyntaxHighlighter.registerLanguage('java', java);
  TypedSyntaxHighlighter.registerLanguage('html', xml);
  TypedSyntaxHighlighter.registerLanguage('xml', xml);
  TypedSyntaxHighlighter.registerLanguage('css', css);
  TypedSyntaxHighlighter.registerLanguage('bash', bash);
  TypedSyntaxHighlighter.registerLanguage('sh', bash);
  TypedSyntaxHighlighter.registerLanguage('json', json);
  TypedSyntaxHighlighter.registerLanguage('yaml', yaml);
  TypedSyntaxHighlighter.registerLanguage('yml', yaml);
  TypedSyntaxHighlighter.registerLanguage('go', go);
  TypedSyntaxHighlighter.registerLanguage('rust', rust);
  TypedSyntaxHighlighter.registerLanguage('swift', swift);
  TypedSyntaxHighlighter.registerLanguage('kotlin', kotlin);
  TypedSyntaxHighlighter.registerLanguage('ruby', ruby);
  TypedSyntaxHighlighter.registerLanguage('php', php);
} else {
  console.error("Phương thức 'registerLanguage' không tồn tại trên SyntaxHighlighter.");
}

// --- ÉP KIỂU CHO SỬ DỤNG JSX ---
// Di chuyển khai báo SafeSyntaxHighlighter ra khỏi component render
const SafeSyntaxHighlighter = SyntaxHighlighter as unknown as React.ComponentType<{
  language: string;
  style: any;
  customStyle?: React.CSSProperties;
  children: string;
}>;


// --- HÀM XỬ LÝ NỘI DUNG ---
const processContentForDisplay = (rawContent: string) => {
  if (typeof rawContent !== 'string' || !rawContent) {
    return { text: '', codeBlock: undefined };
  }

  const codeBlockRegex = /^```(\w+)?\n([\s\S]*?)\n```/;
  const match = rawContent.match(codeBlockRegex);

  if (match) {
    const fullMatch = match[0];
    const language = match[1] || 'text';
    const code = match[2].trim();

    const beforeCode = rawContent.substring(0, rawContent.indexOf(fullMatch)).trim();
    const afterCode = rawContent.substring(rawContent.indexOf(fullMatch) + fullMatch.length).trim();
    const remainingText = [beforeCode, afterCode].filter(t => t).join('\n').trim();

    return {
      text: remainingText,
      codeBlock: { language, code }
    };
  }

  return {
    text: rawContent,
    codeBlock: undefined
  };
};

// --- HÀM CHUYỂN ĐỔI VÀ XỬ LÝ ĐỊNH DẠNG ---
const processFormattedText = (inputText: string): string => {
  // 1. Kiểm tra đầu vào
  if (typeof inputText !== 'string' || !inputText) return inputText;

  let processedText = inputText;

  // --- 0. LOẠI BỎ DẤU GẠCH DƯỚI (_) ---
  processedText = processedText.replace(/_/g, '');

  // --- 0.1 LOẠI BỎ DẤU BACKTICK (`) ---
  processedText = processedText.replace(/`/g, '');

  // --- 1. LOẠI BỎ DÒNG TIÊU ĐỀ CẤP 1, 2, 3 (#, ##, ###) ---
  processedText = processedText.replace(/^\s*#{1,3}\s.*\n?/gm, '');

  // --- 2. XỬ LÝ XUỐNG DÒNG CHO CÁC MẪU PHÂN CHIA Ý ---
  // a) Gạch đầu dòng: -, *, •
  processedText = processedText.replace(/(\n|\s)([*•])\s/g, '$1<br>$2 ');
  // b) Số đánh dấu: 1., 2., 1), 2)
  processedText = processedText.replace(/(\n|\s)(\d+)[.)]\s/g, '$1<br>$2. ');
  // c) Chữ cái đánh dấu: a), b), A), B)
  processedText = processedText.replace(/(\n|\s)([a-zA-Z])[.)]\s/g, '$1<br>$2. ');
  // d) Số La Mã đánh dấu: I., II., III., IV., etc. (cả hoa và thường)
  const romanNumeralPattern = 'M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})';
  processedText = processedText.replace(new RegExp(`(\\n|\\s)(${romanNumeralPattern})[.]\\s`, 'gi'), '$1<br>$2. ');

  // --- 3. CHUẨN HÓA KHOẢNG TRẮNG SAU CÁC DẤU CÂU VÀ KÝ TỰ ĐẶC BIỆT ---
  processedText = processedText.replace(/([.,:?!'"")}\]])\s*([a-zA-Z0-9])/g, '$1 $2');

  // --- 4. CHUẨN HÓA KHOẢNG TRẮNG SAU DẤU BA CHẤM (...) ---
  processedText = processedText.replace(/(\.{3})\s*([a-zA-Z0-9])/g, '$1 $2');

  // --- 5. XỬ LÝ XUỐNG DÒNG CHO "CÁCH", "BƯỚC" ---
  processedText = processedText.replace(/(\n|\s)(Cách|Bước)\s+([0-9a-zA-Z]+)[.:]\s*/gi, '$1<br>$2 $3. ');

  // --- 6. XỬ LÝ MŨI TÊN PHẢN ỨNG HÓA HỌC ---
  processedText = processedText.replace(/->/g, '\\rightarrow');

  // --- 7. XỬ LÝ DẤU HAI CHẤM (:) ---
  processedText = processedText.replace(/(:\s+)(\d+\.|-\s|\*\s)/g, '$1<br>$2');

  // --- 8. LOẠI BỎ CÁC THẺ <br> NẰM TRONG CÔNG THỨC LATEX ---
  // a) Inline math: $...$
  processedText = processedText.replace(/\$([^$]*)\$/g, (match, latexContent) => {
    // Loại bỏ <br> khỏi nội dung công thức
    const cleanedLatex = latexContent.replace(/<br>/g, '');
    return `$${cleanedLatex}$`;
  });

  // b) Display math: $$...$$
  processedText = processedText.replace(/\$\$([\s\S]*?)\$\$/g, (match, latexContent) => {
    // Loại bỏ <br> khỏi nội dung công thức
    const cleanedLatex = latexContent.replace(/<br>/g, '');
    return `$$${cleanedLatex}$$`;
  });

  // --- 9. XỬ LÝ LATEX TRƯỚC (QUAN TRỌNG) ---
  // a) Xử lý display math $$...$$ (cả ${}$ và $$...$$ đều xuống dòng)
  processedText = processedText.replace(/\$\$\n?([\s\S]*?)\n?\$\$/g, (match, latex) => {
    let cleanLatex = '';
    try {
      // Loại bỏ dấu $ ở đầu và cuối nếu có (trường hợp ${}$)
      cleanLatex = latex.trim().replace(/^\$|\$$/g, '');
      const html = katex.renderToString(cleanLatex, { displayMode: true, throwOnError: false });
      return `<div class="katex-display">${html}</div>`;
    } catch (e) {
      console.error("Lỗi khi render LaTeX display:", e);
      // Trả về placeholder hoặc nội dung gốc để dễ debug
      // return `<code class="latex-error">[LATEX ERROR: ${cleanLatex}]</code>`;
      // Hoặc trả về nội dung gốc của công thức để người dùng biết
      return `<code class="latex-error">[LATEX ERROR: ${latex}]</code>`;
    }
  });

  // b) Xử lý inline math $...$ (giữ trên cùng dòng)
  processedText = processedText.replace(/\$([^$]+)\$/g, (match, latex) => {
    let cleanLatex = '';
    try {
      cleanLatex = latex.trim();
      const html = katex.renderToString(cleanLatex, { displayMode: false, throwOnError: false });
      return `<span class="katex-inline">${html}</span>`;
    } catch (e) {
      console.error("Lỗi khi render LaTeX inline:", e);
      // return `<code class="latex-error">[LATEX ERROR: ${cleanLatex}]</code>`;
      return `<code class="latex-error">[LATEX ERROR: ${latex}]</code>`;
    }
  });

  // --- 10. XỬ LÝ ĐỊNH DẠNG VĂN BẢN (Bold, Italic) ---
  // a) Chuyển đổi **text** thành <strong>text</strong>
  processedText = processedText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // b) Chuyển đổi *text* thành <em>text</em>
  // Regex này tránh match * ở đầu/cuối chuỗi hoặc giữa các ký tự không phải chữ số/chữ cái
  processedText = processedText.replace(/(^|\s)\*([^*]+?)\*(?=\s|$|[,.;:!?])/g, '$1<em>$2</em>');

  // --- 11. XỬ LÝ TỪ KHÓA (MỞ ĐẦU, KẾT LUẬN, CHÚ THÍCH) ---
  // Thêm <br> trước các từ khóa nếu chúng xuất hiện ở đầu dòng (sau \n hoặc ở đầu chuỗi)
  const keywords = ['Mở đầu', 'Kết luận', 'Chú thích', 'Ghi chú', 'Lưu ý'];
  const keywordRegex = new RegExp(`(\\n|^)(${keywords.join('|')})`, 'gi');
  processedText = processedText.replace(keywordRegex, '<br>$2');

  // --- 12. LOẠI BỎ CÁC DẤU * KHÔNG DÙNG ĐỂ ĐỊNH DẠNG ---
  // Loại bỏ dấu * còn lại (giả sử là thừa sau khi xử lý <em>)
  processedText = processedText.replace(/\*/g, '');

  // --- 13. LOẠI BỎ CÁC KÝ HIỆU KHÔNG MONG MUỐN KHÁC ---
  processedText = processedText.replace(/[{}]/g, ''); // Loại bỏ {, }, giữ lại %

  // --- 14. CHUYỂN ĐỔI MARKDOWN LINKS [text](url)
  const markdownLinks: { placeholder: string; html: string }[] = [];
  processedText = processedText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, text, url) => {
    const placeholder = `__MARKDOWN_LINK_${Date.now()}_${Math.random()}__`;
    const html = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    markdownLinks.push({ placeholder, html });
    return placeholder;
  });

  // --- 15. CHUYỂN ĐỔI URL THUẦN
  const urlRegex = /\bhttps?:\/\/[^\s)<>\]]+/g;
  processedText = processedText.replace(urlRegex, '<a href="$&" target="_blank" rel="noopener noreferrer">$&</a>');

  // --- 16. THAY THẾ PLACEHOLDER BẰNG HTML LINK THỰC TẾ
  markdownLinks.forEach(item => {
    processedText = processedText.replace(item.placeholder, item.html);
  });

  return processedText;
};

// --- HÀM PHÁT HIỆN NGÔN NGỮ RTL ---
// Kiểm tra xem chuỗi có chứa nhiều ký tự từ script RTL không
const isRtlText = (text: string): boolean => {
  if (typeof text !== 'string' || !text) return false;

  // Regex kiểm tra các ký tự trong phạm vi Unicode của tiếng Ả Rập, Do Thái, v.v.
  const rtlPattern = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const rtlMatches = text.match(rtlPattern);
  const rtlCount = rtlMatches ? rtlMatches.length : 0;
  const totalChars = text.length;

  // Nếu tỷ lệ ký tự RTL cao hơn một ngưỡng nhất định (ví dụ: 30%), coi như là RTL
  return (rtlCount / totalChars) > 0.3;
};

// --- COMPONENT CON CHO NỘI DUNG TIN NHẮN ---
interface ProcessedMessageContentProps {
  rawContent: string;
  onCopyText: (text: string) => void;
  onCopyCode: (code: string) => void;
  isRtl?: boolean;
  // Thêm props mới cho ảnh/video
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string; // Nếu có thumbnail riêng cho video
  onCopyImageUrl?: (url: string) => void; // Hàm copy URL ảnh
  onCopyVideoUrl?: (url: string) => void; // Hàm copy URL video
  onSaveImage?: (url: string, name: string) => void; // Hàm lưu ảnh
  onSaveVideo?: (url: string, name: string) => void; // Hàm lưu video (tùy chọn, có thể chỉ mở link)
}

const ProcessedMessageContent: React.FC<ProcessedMessageContentProps> = React.memo(({ 
  rawContent, 
  onCopyText, 
  onCopyCode, 
  isRtl = false,
  imageUrl,
  videoUrl,
  thumbnailUrl,
  onCopyImageUrl,
  onCopyVideoUrl,
  onSaveImage,
  onSaveVideo // Nhận thêm hàm lưu video
}) => {
  const { text, codeBlock } = useMemo(() => processContentForDisplay(rawContent), [rawContent]);
  // --- XỬ LÝ AN TOÀN HTML ---
  const processedTextHtml = useMemo(() => {
    const rawHtml = processFormattedText(text);
    // Luôn làm sạch HTML trước khi chèn vào DOM
    return DOMPurify.sanitize(rawHtml);
  }, [text]);

  const handleTextClick = useCallback(() => {
    if (typeof text === 'string' && text) onCopyText(text);
  }, [text, onCopyText]);

  const handleCodeClick = useCallback(() => {
    if (codeBlock && typeof codeBlock.code === 'string' && codeBlock.code) onCopyCode(codeBlock.code);
  }, [codeBlock, onCopyCode]);

  // --- HÀM MỚI: Lưu video vào thiết bị (giả lập hoặc mở link) ---
  const handleSaveVideo = (videoUrl: string, videoName: string = 'video') => {
    if (!videoUrl) {
      console.error("handleSaveVideo: videoUrl is null or undefined.");
      return;
    }

    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${videoName}.mp4`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="message-content-and-code">
      {/* --- ÁP DỤNG DIR RTL CHO PHẦN NỘI DUNG VĂN BẢN NẾU CẦN --- */}
      <div
        className="message-text-content"
        // --- SỬ DỤNG HTML ĐÃ LÀM SẠCH ---
        dangerouslySetInnerHTML={{ __html: processedTextHtml }} // processedTextHtml đã được làm sạch
        onClick={handleTextClick}
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{ textAlign: isRtl ? 'right' : 'left' }}
      />
      
      {codeBlock && (
        <div className="message-code-block-wrapper">
          <div className="message-code-block-header">
            <span className="code-language-label">{codeBlock.language}</span>
          </div>
          <div className="message-code-block-content">
            {SafeSyntaxHighlighter && codeBlock.code && typeof codeBlock.code === 'string' && (
              <SafeSyntaxHighlighter
                language={codeBlock.language}
                style={docco}
                customStyle={{
                  margin: '0',
                  borderRadius: '0 0 5px 5px',
                  fontSize: '0.9em',
                  padding: '10px',
                  overflowX: 'auto',
                  minHeight: '50px',
                }}
                children={codeBlock.code}
              />
            )}
            {(!SafeSyntaxHighlighter || !codeBlock.code || typeof codeBlock.code !== 'string') && (
              <pre className="fallback-code-display">
                <code>{codeBlock.code || '[LỖI: Nội dung code không hợp lệ]'}</code>
              </pre>
            )}
          </div>
          <button
            className="copy-button code"
            onClick={(e) => {
              e.stopPropagation();
              handleCodeClick();
            }}
            title="Sao chép code"
          >
            <FiCopy />
          </button>
        </div>
      )}
      {/* --- HIỂN THỊ ẢNH AI --- */}
      {imageUrl && (
        <div className="message-image-container message-media-container"> {/* Thêm class chung nếu cần */}
          <img
            src={imageUrl}
            alt="Generated by AI"
            className="message-image message-image-16-9" // Thêm class cho tỷ lệ 16:9
          />
          {/* NÚT LƯU Ở GÓC TRÊN BÊN PHẢI CỦA ẢNH */}
          <button
            className="save-button image message-media-save-button" // Thêm class để định vị
            onClick={(e) => { e.stopPropagation(); if(onSaveImage) onSaveImage(imageUrl, `ai_image_${Date.now()}`); }}
            title="Lưu ảnh vào thiết bị"
          >
            <span>💾</span>
          </button>
        </div>
      )}
      {/* --- HIỂN THỊ VIDEO AI --- */}
      {videoUrl && (
        <div className="message-video-container message-media-container"> {/* Thêm class chung nếu cần */}
          <video
            src={videoUrl}
            controls // Cho phép người dùng điều khiển video
            className="message-video message-video-16-9" // Thêm class cho tỷ lệ 16:9
            poster={thumbnailUrl} // Sử dụng thumbnail làm poster nếu có
          >
            Your browser does not support the video tag.
          </video>
          {/* NÚT LƯU Ở GÓC TRÊN BÊN PHẢI CỦA VIDEO */}
          <button
            className="save-button video message-media-save-button" // Thêm class để định vị
            onClick={(e) => { e.stopPropagation(); handleSaveVideo(videoUrl, `ai_video_${Date.now()}`); }}
            title="Tải video về thiết bị"
          >
            <span>💾</span>
          </button>
          {/* Có thể vẫn giữ nút copy ở dưới nếu cần */}
          <div className="message-video-controls">
            <button
              className="copy-button video"
              onClick={(e) => { e.stopPropagation(); if(onCopyVideoUrl) onCopyVideoUrl(videoUrl); }}
              title="Sao chép URL video"
            >
              <FiCopy />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});


// --- COMPONENT CON CHO PHẦN TẬP TIN ĐÍNH KÈM ---
interface AttachmentPreviewItemProps {
  attachment: Attachment; // Sử dụng type từ interface Message
  objectURL: string | null;
  defaultImagePlaceholder: string;
  handleMediaToggle: (mediaRef: React.RefObject<HTMLAudioElement | HTMLVideoElement>) => void;
}

// --- COMPONENT CON CHO PHẦN TỬ MEDIA (AUDIO/VIDEO) ---
interface MediaPreviewItemProps {
  src: string;
  type: string; // 'audio' hoặc 'video'
  name: string;
  handleMediaToggle: (mediaRef: React.RefObject<HTMLAudioElement | HTMLVideoElement>) => void;
  defaultImagePlaceholder: string;
}

const MediaPreviewItem: React.FC<MediaPreviewItemProps> = React.memo(({ src, type, name, handleMediaToggle, defaultImagePlaceholder }) => {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);

  // Hàm xử lý lỗi chung cho media
  const handleMediaError = (e: React.SyntheticEvent<HTMLMediaElement, Event>, fallbackUrl: string) => {
    // Ghi log lỗi hoặc hiển thị placeholder
    console.error("Lỗi khi tải media:", e);
    // Không thể thay đổi src của <audio> hoặc <video> như <img> để hiển thị placeholder
    // Có thể ẩn phần tử hoặc hiển thị một div placeholder
    const target = e.target as HTMLMediaElement;
    target.style.display = 'none';
    // Có thể thêm một div placeholder ở đây
    // Ví dụ: thêm một div sau phần tử này với nội dung "Lỗi tải media"
  };

  if (type === 'video') {
    return (
      <div className="attachment-video-preview-container">
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>} // Ép kiểu an toàn
          src={src}
          controls={false}
          className="attachment-video-preview"
          onError={(e) => handleMediaError(e, defaultImagePlaceholder)}
        >
          Your browser does not support the video tag.
        </video>
        <span className="attachment-name">{name}</span>
        <button
          className="media-control-button"
          onClick={() => handleMediaToggle(mediaRef)}
          title={mediaRef.current?.paused ? "Phát" : "Tạm dừng"}
        >
          {mediaRef.current?.paused ? "▶️" : "⏸️"}
        </button>
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <div className="attachment-audio-preview-container">
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>} // Ép kiểu an toàn
          src={src}
          controls={false}
          className="attachment-audio-preview"
          onError={(e) => handleMediaError(e, defaultImagePlaceholder)}
        >
          Your browser does not support the audio tag.
        </audio>
        <span className="attachment-name">{name}</span>
        <button
          className="media-control-button"
          onClick={() => handleMediaToggle(mediaRef)}
          title={mediaRef.current?.paused ? "Phát" : "Tạm dừng"}
        >
          {mediaRef.current?.paused ? "▶️" : "⏸️"}
        </button>
      </div>
    );
  }

  // Nếu type không phải là video hoặc audio
  return (
    <div className="attachment-file-placeholder">
      <span>🖼️</span>
      <span>{name}</span>
    </div>
  );
});

const AttachmentPreviewItem: React.FC<AttachmentPreviewItemProps> = React.memo(({ attachment, objectURL, defaultImagePlaceholder, handleMediaToggle }) => {
  const isImage = attachment.type.startsWith('image/');
  const isVideo = attachment.type.startsWith('video/');
  const isAudio = attachment.type.startsWith('audio/');

  if (isImage && objectURL) {
    // Hàm xử lý lỗi riêng cho img
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl: string) => {
      const target = e.target as HTMLImageElement;
      if (target.src !== fallbackUrl) {
        target.src = fallbackUrl;
      } else {
        target.style.display = 'none';
      }
    };

    return (
      <div className="attachment-image-preview-container">
        <img
          src={objectURL}
          alt={`Preview ${attachment.name}`}
          className="attachment-image-preview"
          onError={(e) => handleImageError(e, defaultImagePlaceholder)}
        />
        <span className="attachment-name">{attachment.name}</span>
      </div>
    );
  }

  if ((isVideo || isAudio) && objectURL) {
    return (
      <MediaPreviewItem
        src={objectURL}
        type={isVideo ? 'video' : 'audio'} // Xác định type
        name={attachment.name}
        handleMediaToggle={handleMediaToggle}
        defaultImagePlaceholder={defaultImagePlaceholder}
      />
    );
  }

  // Nếu không phải ảnh/video/audio hoặc không có objectURL, hiển thị placeholder
  return (
    <div className="attachment-file-placeholder">
      <span>🖼️</span>
      <span>{attachment.name}</span>
    </div>
  );
});

// --- INTERFACE CHO PROPS ---
interface MessageListProps {
  messages: Message[];
  onEditMessage: (message: Message) => void;
}

// --- COMPONENT CHÍNH ---
const MessageList: React.FC<MessageListProps> = ({ messages, onEditMessage }) => {
  const { loading, userInfo, getObjectURL } = useChat(); // Lấy hàm getObjectURL từ context
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleCopy = (text: string) => {
    if (!text) {
      console.warn("handleCopy: Attempted to copy empty or undefined text.");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log('Đã sao chép: ', text);
        })
        .catch(err => {
          console.error('Lỗi khi sao chép vào clipboard (API): ', err);
          fallbackCopyTextToClipboard(text);
        });
    } else {
      console.warn('Clipboard API không được hỗ trợ trong trình duyệt này.');
      fallbackCopyTextToClipboard(text);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    if (!text) {
      console.warn("fallbackCopyTextToClipboard: Attempted to copy empty or undefined text.");
      return;
    }
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        console.log('Đã sao chép (fallback): ', text);
      } else {
        console.error('Lệnh copy thất bại (fallback).');
      }
    } catch (err) {
      console.error('Không thể sao chép văn bản (fallback): ', err);
    }

    document.body.removeChild(textArea);
  };

  // --- HÀM MỚI: Lưu ảnh vào thiết bị ---
  const handleSaveImage = (imageUrl: string, imageName: string = 'image') => {
    if (!imageUrl) {
      console.error("handleSaveImage: imageUrl is null or undefined.");
      return;
    }

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${imageName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectForEdit = (message: Message) => {
    if (message.sender === 'user') {
      onEditMessage(message);
    }
  };

  // Avatar AI
  const aiAvatar = useMemo(() => "https://placehold.co/100x100/316293/FFFFFF/png?text=S", []);

  // State cho phần suy luận
  const [expandedThinkings, setExpandedThinkings] = useState<{ [key: string]: boolean }>({});

  const handleToggleThinking = (messageId: string) => {
    setExpandedThinkings(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // Hàm trích xuất phần suy luận (nếu có)
  const extractThinkingAndResponse = useCallback((fullText: string): { thinking?: string; response: string } => {
    if (typeof fullText !== 'string') return { response: '' };
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/i;
    const match = fullText.match(thinkingRegex);

    if (match) {
      const thinking = match[1].trim();
      const response = fullText.replace(thinkingRegex, '').trim();
      return { thinking, response };
    } else {
      return { response: fullText };
    }
  }, []);

  // --- HÀM XỬ LÝ LỖI ẢNH ---
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl: string) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== fallbackUrl) {
      target.src = fallbackUrl;
    } else {
      target.style.display = 'none';
    }
  };

  const defaultImagePlaceholder = "https://placehold.co/150x150?text=Image+Not+Found";

  // --- HÀM MỚI: Xử lý phát/tạm dừng audio/video ---
  const handleMediaToggle = async (mediaRef: React.RefObject<HTMLAudioElement | HTMLVideoElement>) => {
    if (!mediaRef.current) return;

    const mediaElement = mediaRef.current;

    if (mediaElement.paused) {
      try {
        await mediaElement.play();
      } catch (error) {
        if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotAllowedError')) {
          console.warn("Phát bị hủy bỏ:", error.name);
        } else {
          console.error("Lỗi khi phát:", error);
        }
      }
    } else {
      mediaElement.pause();
    }
  };

  return (
    <div className="message-list">
      {messages.map((msg) => {
        const { thinking, response } = extractThinkingAndResponse(msg.content || "");

        // --- PHÁT HIỆN NGÔN NGỮ CHO PHẦN NỘI DUNG AI ---
        const isResponseRtl = msg.sender === 'ai' && isRtlText(response);
        const isThinkingRtl = msg.sender === 'ai' && isRtlText(thinking || "");

        return (
          <div key={msg.id} className={`message-container ${msg.sender}`}>
            {msg.sender === 'ai' && (
              <>
                <img
                  src={aiAvatar}
                  alt="AI Avatar"
                  className="message-avatar ai"
                  onError={(e) => handleImageError(e, "https://placeholder.co/30/0000ff/white?text=AI+ERR  ")}
                />
                <div className="message ai" onClick={() => handleSelectForEdit(msg)}>
                  <div className="message-content-and-image">
                    {thinking !== undefined && (
                      <div className="message-thinking-section">
                        <button
                          className="thinking-toggle-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleThinking(msg.id);
                          }}
                        >
                          {expandedThinkings[msg.id] ? "[-] Suy luận" : "[+] Suy luận"}
                        </button>
                        {expandedThinkings[msg.id] && (
                          <div
                            className="message-thinking-content"
                            // --- XỬ LÝ AN TOÀN HTML CHO PHẦN SUY LUẬN ---
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processFormattedText(thinking || "")) }}
                            dir={isThinkingRtl ? 'rtl' : 'ltr'}
                          />
                        )}
                      </div>
                    )}
                    {/* --- ÁP DỤNG DIR RTL CHO PHẦN NỘI DUNG CHÍNH NẾU CẦN --- */}
                    <ProcessedMessageContent
                      rawContent={response}
                      onCopyText={handleCopy}
                      onCopyCode={handleCopy}
                      isRtl={isResponseRtl}
                      // Truyền các prop mới cho ảnh/video
                      imageUrl={msg.imageUrl} // Truyền URL ảnh từ message
                      videoUrl={msg.videoUrl} // Truyền URL video từ message
                      thumbnailUrl={msg.thumbnailUrl} // Truyền thumbnail từ message
                      onCopyImageUrl={handleCopy} // Dùng hàm copy chung
                      onCopyVideoUrl={handleCopy} // Dùng hàm copy chung
                      onSaveImage={handleSaveImage} // Truyền hàm lưu ảnh
                      // onSaveVideo={handleSaveVideo} // Nếu bạn muốn truyền hàm riêng biệt
                    />
                    {/* --- PHẦN NÀY CŨ (HIỂN THỊ ẢNH AI) ĐÃ DI CHUYỂN VÀO ProcessedMessageContent --- */}
                    {/* {msg.imageUrl && typeof msg.imageUrl === 'string' && (
                      <div className="message-image-container">
                        <img
                          src={msg.imageUrl}
                          alt="Generated by AI"
                          className="message-image"
                          onError={(e) => handleImageError(e, defaultImagePlaceholder)}
                        />
                        <div className="message-image-controls">
                          <button
                            className="copy-button image"
                            onClick={(e) => { e.stopPropagation(); handleCopy(msg.imageUrl!); }}
                            title="Sao chép URL ảnh"
                          >
                            <FiCopy />
                          </button>
                          <button
                            className="save-button image"
                            onClick={(e) => { e.stopPropagation(); handleSaveImage(msg.imageUrl!, `ai_generated_${msg.id}`); }}
                            title="Lưu ảnh vào thiết bị"
                          >
                            <span>💾</span>
                          </button>
                        </div>
                      </div>
                    )} */}
                  </div>
                  <div className="message-timestamp">
                    {msg.timestamp.toLocaleDateString('vi-VN')}{' '}
                    {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                </div>
                <button
                  className="copy-button ai"
                  onClick={(e) => { e.stopPropagation(); handleCopy(msg.content || ""); }}
                  title="Sao chép toàn bộ tin nhắn"
                >
                  <FiCopy />
                </button>
              </>
            )}

            {msg.sender === 'user' && (
              <>
                <button
                  className="copy-button user"
                  onClick={(e) => { e.stopPropagation(); handleCopy(msg.content || ""); }}
                  title="Sao chép văn bản"
                >
                  <FiCopy />
                </button>
                <div className="message user" onClick={() => handleSelectForEdit(msg)}>
                  <div className="message-content">
                    {msg.content}
                  </div>
                  {/* --- HIỂN THỊ ẢNH/VIDEO NGƯỜI DÙNG ĐÍNH KÈM (PREVIEW THỰC SỰ TỪ CONTEXT) --- */}
                  {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                    <div className="message-attachments-preview">
                      {msg.attachments.map((att, idx) => {
                        if (!att || typeof att !== 'object' || !att.name || !att.size || !att.type) {
                          console.warn("File đính kèm không hợp lệ, bỏ qua:", att);
                          return null;
                        }

                        // Lấy objectURL từ context dựa trên attachment.id
                        const objectURL = getObjectURL(att.id);

                        return (
                          <AttachmentPreviewItem
                            key={idx} // Hoặc có thể dùng att.id nếu đảm bảo duy nhất
                            attachment={att}
                            objectURL={objectURL}
                            // onImageError={handleImageError} // Không truyền nữa
                            defaultImagePlaceholder={defaultImagePlaceholder}
                            handleMediaToggle={handleMediaToggle} // Truyền hàm xử lý media
                          />
                        );
                      }).filter(Boolean)}
                    </div>
                  )}
                  <div className="message-timestamp">
                    {msg.timestamp.toLocaleDateString('vi-VN')}{' '}
                    {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                </div>
                <img
                  src={userInfo.avatar}
                  alt="User Avatar"
                  className="message-avatar user"
                  onError={(e) => handleImageError(e, "https://placeholder.co/40/00ff00/white?text=U+ERR  ")}
                />
              </>
            )}
          </div>
        );
      })}
      {loading && (
        <div className="message-container ai">
          <img
            src={aiAvatar}
            alt="AI Avatar"
            className="message-avatar ai"
            onError={(e) => handleImageError(e, "https://placeholder.co/30/0000ff/white?text=AI+ERR  ")}
          />
          <div className="message ai">
            <div className="message-content typing-indicator-dots">
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </div>
          </div>
          <button className="copy-button ai" title="Sao chép">
            <FiCopy />
          </button>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;