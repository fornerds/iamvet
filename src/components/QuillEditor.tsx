"use client";

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

// 커스텀 Size 스타일 등록 (모듈 레벨에서 한 번만 실행)
let CustomSize: any = null;
if (typeof window !== 'undefined') {
  try {
    CustomSize = Quill.import('attributors/style/size') as any;
    CustomSize.whitelist = ['10px', '12px', '14px', '16px', '18px', '24px', '32px', '36px', '48px'];
    Quill.register(CustomSize, true);
  } catch (error) {
    console.warn('Failed to register custom Size attributor:', error);
  }
}

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
          // Size attributor 재등록 (컴포넌트 레벨에서도 확인)
          let Size = CustomSize;
          if (!Size) {
            Size = Quill.import('attributors/style/size') as any;
            Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '24px', '32px', '36px', '48px'];
            Quill.register(Size, true);
          }

          // Quill 인스턴스 생성
          quillInstance.current = new Quill(quillRef.current, {
            theme: 'snow',
            placeholder,
            modules: {
              toolbar: {
                container: [
                  [{ 'size': Size.whitelist }], // Size.whitelist 직접 사용
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
            
            // 이모티콘 크기 제한 (이모지/이모티콘만 24px로 제한, 일반 텍스트는 유지)
            const spans = editor.querySelectorAll('span[style*="font-size"]');
            spans.forEach((span) => {
              const htmlSpan = span as HTMLElement;
              const fontSize = htmlSpan.style.fontSize;
              // 이모지/이모티콘인지 확인 (텍스트 내용이 없거나 특수 문자만 있는 경우)
              const textContent = htmlSpan.textContent || '';
              // 이모지 유니코드 범위 체크 (ES5 호환 방식)
              const isEmoji = textContent.length <= 2 && (
                /[\uD83C-\uDBFF\uDC00-\uDFFF]/.test(textContent) || // 이모지
                /[\u2600-\u26FF]/.test(textContent) || // 기타 기호
                /[\u2700-\u27BF]/.test(textContent) // 딩뱃
              );
              
              if (fontSize && isEmoji) {
                const sizeValue = parseInt(fontSize);
                // 이모지/이모티콘만 24px로 제한
                if (sizeValue > 24) {
                  htmlSpan.style.fontSize = '24px';
                }
              }
              // 일반 텍스트는 Quill이 설정한 폰트 사이즈 유지
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
            color: #3B394D !important;
          }
          
          /* Quill 에디터 내부 모든 텍스트 요소에 색상 적용 */
          .ql-editor p,
          .ql-editor div,
          .ql-editor span,
          .ql-editor li,
          .ql-editor ol,
          .ql-editor ul,
          .ql-editor blockquote,
          .ql-editor pre,
          .ql-editor code {
            color: #3B394D !important;
          }
          
          /* Quill이 적용한 폰트 사이즈가 제대로 표시되도록 보장 */
          .ql-editor [style*="font-size"] {
            /* Quill이 설정한 font-size 스타일을 그대로 사용 */
          }
          
          /* 각 폰트 사이즈별 스타일 (Quill이 적용한 스타일 유지) */
          .ql-editor [style*="font-size: 10px"] {
            font-size: 10px !important;
          }
          .ql-editor [style*="font-size: 12px"] {
            font-size: 12px !important;
          }
          .ql-editor [style*="font-size: 14px"] {
            font-size: 14px !important;
          }
          .ql-editor [style*="font-size: 16px"] {
            font-size: 16px !important;
          }
          .ql-editor [style*="font-size: 18px"] {
            font-size: 18px !important;
          }
          .ql-editor [style*="font-size: 24px"] {
            font-size: 24px !important;
          }
          .ql-editor [style*="font-size: 32px"] {
            font-size: 32px !important;
          }
          .ql-editor [style*="font-size: 36px"] {
            font-size: 36px !important;
          }
          .ql-editor [style*="font-size: 48px"] {
            font-size: 48px !important;
          }
          
          .ql-toolbar {
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
            border-bottom: 1px solid #EFEFF0 !important;
          }

          /* 폰트 사이즈 옵션 스타일 - 참고 코드 방식 사용 */
          .ql-snow .ql-picker.ql-size .ql-picker-label::before,
          .ql-snow .ql-picker.ql-size .ql-picker-item::before {
            content: attr(data-value);
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

          /* Quill이 적용한 폰트 사이즈 유지 */
          .ql-editor span[style*="font-size"] {
            /* Quill이 설정한 font-size를 그대로 사용 */
          }
          
          /* 일반 텍스트의 폰트 사이즈는 Quill이 설정한 대로 유지 */
          .ql-editor span[style*="font-size"] {
            /* Quill이 설정한 font-size를 그대로 사용 */
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