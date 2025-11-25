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

          // 초기 내용 설정
          if (value) {
            quillInstance.current.root.innerHTML = value;
          }

          // 내용 변경 이벤트 리스너
          quillInstance.current.on('text-change', () => {
            // 외부에서 value prop으로 업데이트하는 중이 아닐 때만 onChange 호출
            if (!isUpdatingFromProp.current) {
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
        `}</style>
      </div>
    );
  }
);

QuillEditor.displayName = 'QuillEditor';

export default QuillEditor;