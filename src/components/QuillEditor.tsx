"use client";

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export interface QuillEditorRef {
  getEditor: () => Quill | null;
  setContent: (content: string) => void;
  getContent: () => string;
}

const QuillEditor = forwardRef<QuillEditorRef, QuillEditorProps>(
  ({ value = '', onChange, placeholder = '내용을 입력하세요', height = 400 }, ref) => {
    const quillRef = useRef<HTMLDivElement>(null);
    const quillInstance = useRef<Quill | null>(null);
    const isInitialized = useRef(false);
    const isUpdatingFromProp = useRef(false);
    const lastValueRef = useRef<string>(value);
    const handlePasteRef = useRef<((e: ClipboardEvent) => void) | null>(null);

    useImperativeHandle(ref, () => ({
      getEditor: () => quillInstance.current,
      setContent: (content: string) => {
        if (quillInstance.current) {
          quillInstance.current.root.innerHTML = content;
        }
      },
      getContent: () => {
        return quillInstance.current?.root.innerHTML || '';
      },
    }));

    useEffect(() => {
      if (quillRef.current && !quillInstance.current && !isInitialized.current) {
        isInitialized.current = true;

        // 기존 Quill 관련 요소들 정리
        const existingToolbar = quillRef.current.parentNode?.querySelector('.ql-toolbar');
        if (existingToolbar) {
          existingToolbar.remove();
        }

        // 컨테이너 정리
        quillRef.current.innerHTML = '';
        quillRef.current.className = '';

        // 이미지 업로드 핸들러
        const imageHandler = () => {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = () => {
            const file = input.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                const range = quillInstance.current?.getSelection();
                if (range && quillInstance.current) {
                  // 실제로는 서버에 업로드하고 URL을 받아야 합니다
                  const url = reader.result as string;
                  quillInstance.current.insertEmbed(range.index, 'image', url);
                }
              };
              reader.readAsDataURL(file);
            }
          };
        };

        try {
          // Quill 인스턴스 생성
          quillInstance.current = new Quill(quillRef.current, {
            theme: 'snow',
            placeholder,
            modules: {
              toolbar: {
                container: [
                  [{ 'size': ['small', false, 'large', 'huge'] }], // 폰트 사이즈 추가
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  [{ 'align': [] }],
                  ['link', 'image'],
                  ['clean']
                ],
                handlers: {
                  image: imageHandler,
                },
              },
            },
          });

          // 이모티콘 및 이미지 크기 정규화 함수
          const normalizeContent = () => {
            if (!quillInstance.current) return;
            
            const editor = quillInstance.current.root;
            
            // 이모티콘 크기 제한 (24px 이상이면 24px로 제한)
            const spans = editor.querySelectorAll('span[style*="font-size"]');
            spans.forEach((span) => {
              const htmlSpan = span as HTMLElement;
              const fontSize = htmlSpan.style.fontSize;
              if (fontSize) {
                const sizeValue = parseInt(fontSize);
                if (sizeValue > 24) {
                  htmlSpan.style.fontSize = '24px';
                }
              }
            });

            // 이미지 크기 제한
            const images = editor.querySelectorAll('img');
            images.forEach((img) => {
              const htmlImg = img as HTMLImageElement;
              const maxWidth = 800; // 에디터 최대 너비에 맞춤
              
              // width 속성이나 style에서 크기 확인
              const currentWidth = htmlImg.width || parseInt(htmlImg.style.width) || htmlImg.offsetWidth;
              
              if (currentWidth > maxWidth) {
                htmlImg.style.maxWidth = `${maxWidth}px`;
                htmlImg.style.width = 'auto';
                htmlImg.style.height = 'auto';
                htmlImg.removeAttribute('width');
                htmlImg.removeAttribute('height');
              }
            });
          };

          // 초기 내용 설정
          if (value) {
            quillInstance.current.root.innerHTML = value;
            // 초기 내용도 정규화
            normalizeContent();
          }

          // 붙여넣기 이벤트 핸들러
          const editorElement = quillInstance.current.root;
          const handlePaste = (e: ClipboardEvent) => {
            // 기본 붙여넣기 후 정규화
            setTimeout(() => {
              normalizeContent();
            }, 0);
          };

          handlePasteRef.current = handlePaste;
          editorElement.addEventListener('paste', handlePaste);

          // 내용 변경 이벤트 리스너
          quillInstance.current.on('text-change', () => {
            // 외부에서 value prop으로 업데이트하는 중이 아닐 때만 onChange 호출
            if (!isUpdatingFromProp.current) {
              // 이모티콘 및 이미지 크기 정규화
              normalizeContent();
              
              const html = quillInstance.current?.root.innerHTML || '';
              lastValueRef.current = html;
              onChange?.(html);
            }
          });
        } catch (error) {
          console.error('Quill initialization error:', error);
          isInitialized.current = false;
        }
      }

      return () => {
        if (quillInstance.current) {
          try {
            quillInstance.current.off('text-change');
            // paste 이벤트 리스너 제거
            if (handlePasteRef.current) {
              const editorElement = quillInstance.current.root;
              editorElement.removeEventListener('paste', handlePasteRef.current);
              handlePasteRef.current = null;
            }
          } catch (e) {
            // Ignore errors during cleanup
          }
          quillInstance.current = null;
        }
        isInitialized.current = false;
      };
    }, []);

    // value prop이 변경될 때 에디터 내용 업데이트 (외부에서 변경된 경우만)
    useEffect(() => {
      if (quillInstance.current && value !== lastValueRef.current) {
        isUpdatingFromProp.current = true;
        quillInstance.current.root.innerHTML = value;
        lastValueRef.current = value;
        // 다음 이벤트 루프에서 플래그 해제
        setTimeout(() => {
          isUpdatingFromProp.current = false;
        }, 0);
      }
    }, [value]);

    return (
      <div className="border border-[#EFEFF0] rounded-lg overflow-hidden">
        <div 
          ref={quillRef} 
          style={{ height: `${height}px` }}
        />
        
        <style jsx global>{`
          .ql-editor {
            font-family: 'SUIT', sans-serif !important;
            font-size: 16px;
            line-height: 1.6;
            min-height: ${height - 50}px;
          }
          
          .ql-toolbar {
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
            border-bottom: 1px solid #EFEFF0 !important;
          }

          .ql-container {
            border-left: none !important;
            border-right: none !important;
            border-bottom: none !important;
          }

          .ql-editor.ql-blank::before {
            color: #9EA5AF;
            font-style: normal;
          }

          /* 이모티콘 및 이모지 크기 제한 (24px로 제한) */
          .ql-editor span[style*="font-size"] {
            max-height: 24px !important;
            max-width: 24px !important;
            font-size: 24px !important;
            display: inline-block !important;
            vertical-align: middle !important;
            line-height: 1.2 !important;
            overflow: hidden !important;
          }

          /* 이미지 크기 제한 (에디터 너비에 맞춤) */
          .ql-editor img {
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 8px 0 !important;
          }

          /* 큰 이미지가 붙여넣기될 때 자동으로 크기 조정 */
          .ql-editor img[width] {
            max-width: 800px !important;
            width: auto !important;
          }

          /* 이모티콘이 포함된 텍스트 정렬 개선 */
          .ql-editor p,
          .ql-editor div {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
        `}</style>
      </div>
    );
  }
);

QuillEditor.displayName = 'QuillEditor';

export default QuillEditor;