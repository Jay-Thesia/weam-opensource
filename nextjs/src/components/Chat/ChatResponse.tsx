import { LINK } from '@/config/config';
import React, { useState, useRef, useEffect } from 'react';
import { MarkOutPut } from './MartOutput';
import ThreeDotLoader from '../Loader/ThreeDotLoader';
import StreamLoader from '../Loader/StreamLoader';
import { API_TYPE_OPTIONS, WEB_RESOURCES_DATA } from '@/utils/constant';
import DocumentProcessing from '../Loader/DocumentProcess';
import PreviewImage from '../ui/PreviewImage';
import AgentAnalyze from '../Loader/AgentAnalyze';
import PageSpeedResponse from './PageSpeedResponse';
import { PAGE_SPEED_RECORD_KEY } from '@/hooks/conversation/useConversation';
import WebAgentLoader from '../Loader/WebAgentLoader';
import VideoCallAgentLoader from '../Loader/VideoCallAgentLoader';
import SalesCallLoader from '../Loader/SalesCallLoader';
import ShowResources from './ShowResources';
import TextAreaBox from '@/widgets/TextAreaBox';
import Lottie from "lottie-react";
import loaderAnimation from '../loader.json';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import useCanvasInput from '@/hooks/chat/useCanvasInput';
import CanvasInput from './CanvasInput';
type ResponseLoaderProps = {
    code: string;
    loading: boolean;
    proAgentCode: string;
}

export const GeneratedImagePreview = ({ src }) => {
    return (
        <PreviewImage
            src={src}
            actualWidth={300}
            actualHeight={300}
            previewWidth={500}
            previewHeight={500}
            className='max-w-[300px]'
        />
    );
};

const DallEImagePreview = ({
    conversations,
    i,
    loading,
    answerMessage,
    response,
}) => {
    return (
        <div className=" flex flex-col items-start gap-4 break-words min-h-5">
            <div className="chat-content max-w-none w-full break-words text-font-16 leading-7 tracking-[0.16px]">
                {conversations.length - 1 == i ? (
                    <>
                        {loading ? (
                            <StreamLoader />
                        ) : answerMessage != '' ? (
                            <GeneratedImagePreview
                                src={`${LINK.AWS_S3_URL}/${answerMessage}`}
                            />
                        ) : (
                            <GeneratedImagePreview
                                src={`${LINK.AWS_S3_URL}/${response}`}
                            />
                        )}
                    </>
                ) : (
                    <GeneratedImagePreview
                        src={`${LINK.AWS_S3_URL}/${response}`}
                    />
                )}
            </div>
        </div>
    );
};

const StreamingChatLoaderOption = ({ code, loading, proAgentCode }: ResponseLoaderProps) => {
    const loadingComponents = {
        [API_TYPE_OPTIONS.OPEN_AI_WITH_DOC]: <DocumentProcessing />,
    };
    return loadingComponents[code] || <StreamLoader />;
};

const ChatResponse = ({ conversations, i, loading, answerMessage, m, handleSubmitPrompt, privateChat = true, isStreamingLoading, proAgentCode, onResponseUpdate, onResponseEdited, onOpenEditModal }) => {

    // Inline editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [viewMode, setViewMode] = useState<'markdown' | 'plaintext'>('markdown');
    const textareaRef = useRef(null);

    const [originalMarkdown, setOriginalMarkdown] = useState('');

    // Canvas input functionality
    const {
        showCanvasBox,
        inputPosition,
        handleDeSelectionChanges,
        selectedId
    } = useCanvasInput();

    // Convert markdown to formatted text that preserves some styling
    const markdownToPlainText = (markdown: string) => {
        if (!markdown) return '';

        // Convert markdown to HTML-like formatting that can be displayed
        let formattedText = markdown
            // Convert headers to plain text with line breaks
            .replace(/^#{1,6}\s+(.+)$/gm, '\n$1\n')
            // Keep bold formatting as <strong> tags
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Keep italic formatting as <em> tags
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Keep code formatting as <code> tags
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Convert links to just text
            .replace(/\[([^\]]*?)\]\([^)]*?\)/g, '$1')
            // Convert markdown lists to simple bullets
            .replace(/^[-*+]\s+(.+)$/gm, '• $1')
            // Convert numbered lists
            .replace(/^\d+\.\s+(.+)$/gm, '$1')
            // Remove blockquotes but keep content
            .replace(/^>\s+(.+)$/gm, '$1')
            // Remove horizontal rules
            .replace(/^[-*_]{3,}$/gm, '')
            // Convert ==text== to <u>text</u> for underline
            .replace(/==(.*?)==/g, '<u>$1</u>')
            // Clean up excessive whitespace
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();

        console.log('Markdown to formatted text conversion:', {
            input: markdown.substring(0, 100),
            output: formattedText.substring(0, 100)
        });

        return formattedText;
    };



    // Handle view mode toggle
    const handleViewModeToggle = (mode: 'markdown' | 'plaintext') => {
        if (mode === viewMode) return;

        if (mode === 'plaintext') {
            // Switching to plain text mode - store current markdown content and show plain text preview
            if (viewMode === 'markdown') {
                // Store the current markdown content as the original
                setOriginalMarkdown(editContent);
                console.log('Switched to plain text mode - Stored markdown as original:', editContent.substring(0, 100));
            }
            // Plain text mode shows read-only preview, so we don't need to change editContent
            console.log('Switched to plain text mode - Showing read-only plain text preview');
        } else {
            // Switching to markdown mode - show markdown content for editing
            if (originalMarkdown) {
                setEditContent(originalMarkdown);
                console.log('Switched to markdown mode - Showing original markdown:', originalMarkdown.substring(0, 100));
            } else {
                // Fallback: use current content
                console.log('Switched to markdown mode - Using current content');
            }
        }

        setViewMode(mode);
    };

    // Function to merge plain text changes into original markdown structure
    const mergePlainTextIntoOriginalMarkdown = (plainText: string, originalMarkdown: string) => {
        if (!plainText || !originalMarkdown) return plainText;

        console.log('Merging plain text into original markdown...');
        console.log('Original markdown:', originalMarkdown.substring(0, 200));
        console.log('Edited plain text:', plainText.substring(0, 200));

        // Convert original markdown to plain text for comparison
        const originalPlainText = markdownToPlainText(originalMarkdown);
        console.log('Original as plain text:', originalPlainText.substring(0, 200));

        // If no changes were made, return original markdown
        if (plainText.trim() === originalPlainText.trim()) {
            console.log('No changes detected, returning original markdown');
            return originalMarkdown;
        }

        // Start with the original markdown as base
        let result = originalMarkdown;

        // Find the differences between original plain text and edited plain text
        const originalWords = originalPlainText.split(/(\s+)/);
        const editedWords = plainText.split(/(\s+)/);

        // Create a mapping of changes
        const changes: { [key: string]: string } = {};

        // Find changed words
        for (let i = 0; i < Math.max(originalWords.length, editedWords.length); i++) {
            const originalWord = originalWords[i] || '';
            const editedWord = editedWords[i] || '';

            if (originalWord !== editedWord && originalWord.trim() && editedWord.trim()) {
                changes[originalWord] = editedWord;
                console.log(`Word changed: "${originalWord}" → "${editedWord}"`);
            }
        }

        // Apply changes to the original markdown
        for (const [originalWord, newWord] of Object.entries(changes)) {
            // Use word boundary regex to ensure we only replace exact words
            const regex = new RegExp(`\\b${originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
            result = result.replace(regex, newWord);
        }

        console.log('Final merged markdown:', result.substring(0, 200));
        return result;
    };

    // Function to merge changes within a single line while preserving markdown structure
    const mergeLineChanges = (editedLine: string, originalPlainLine: string, originalMarkdownLine: string) => {
        if (!editedLine.trim()) return editedLine;

        // If the original markdown line is empty, apply basic formatting
        if (!originalMarkdownLine.trim()) {
            return applyBasicMarkdownFormatting(editedLine);
        }

        // Split lines into words for word-by-word comparison
        const editedWords = editedLine.split(/(\s+)/);
        const originalPlainWords = originalPlainLine.split(/(\s+)/);
        const originalMarkdownWords = originalMarkdownLine.split(/(\s+)/);

        const resultWords: string[] = [];

        // Process each word/space
        for (let i = 0; i < editedWords.length; i++) {
            const editedWord = editedWords[i];
            const originalPlainWord = originalPlainWords[i] || '';
            const originalMarkdownWord = originalMarkdownWords[i] || '';

            // If word unchanged, use original markdown formatting
            if (editedWord === originalPlainWord && originalMarkdownWord) {
                resultWords.push(originalMarkdownWord);
            } else {
                // Word was modified, check if it needs markdown formatting
                if (editedWord.trim() && !editedWord.match(/^\s+$/)) {
                    // Apply basic markdown formatting to new/modified words
                    resultWords.push(applyBasicMarkdownFormatting(editedWord));
                } else {
                    resultWords.push(editedWord);
                }
            }
        }

        return resultWords.join('');
    };

    // Function to apply basic markdown formatting to new content
    const applyBasicMarkdownFormatting = (text: string) => {
        if (!text.trim()) return text;

        // Don't apply formatting to whitespace
        if (text.match(/^\s+$/)) return text;

        // Check if it's a bullet point
        if (text.startsWith('• ')) {
            return text.replace(/^•\s+/, '- ');
        }

        // Check if it's a numbered list
        if (/^\d+\.\s+/.test(text)) {
            return text;
        }

        // For regular text, don't add any formatting - keep as is
        return text;
    };

    // Simple function to convert plain text to markdown
    const convertPlainTextToMarkdown = (plainText: string) => {
        if (!plainText) return '';

        console.log('Converting plain text to markdown for saving...');
        console.log('Plain text to convert:', plainText.substring(0, 200));

        // Simple conversion to markdown
        let result = plainText
            // Convert bullet points to markdown lists
            .replace(/^•\s+(.+)$/gm, '- $1')
            // Convert numbered lists (keep as is)
            .replace(/^(\d+)\.\s+(.+)$/gm, '$1. $2')
            // Convert short lines to headers (if they look like titles)
            .replace(/^([A-Z][A-Za-z\s]{2,50})(?=\n|$)/gm, (match) => {
                if (match.length < 60 && !match.endsWith('.') && !match.endsWith(',')) {
                    return `### ${match}`;
                }
                return match;
            })
            // Add proper line breaks
            .replace(/\n\n/g, '\n\n')
            .trim();

        console.log('Converted to markdown:', result.substring(0, 200));
        return result;
    };

    // Convert plain text back to markdown format
    // This function should preserve the original markdown structure as much as possible
    const plainTextToMarkdown = (plainText: string, originalMarkdown?: string) => {
        if (!plainText) return '';

        console.log('Converting plain text to markdown...');
        console.log('Original markdown:', originalMarkdown?.substring(0, 200));
        console.log('Plain text to convert:', plainText.substring(0, 200));

        // If we have original markdown and the plain text is the same as the converted original,
        // return the original markdown to preserve formatting
        if (originalMarkdown) {
            const convertedOriginal = markdownToPlainText(originalMarkdown);
            console.log('Converted original:', convertedOriginal.substring(0, 200));

            if (plainText.trim() === convertedOriginal.trim()) {
                console.log('Returning original markdown to preserve formatting');
                return originalMarkdown;
            }
        }

        // Simple conversion for new/modified content
        let result = plainText
            // Convert bullet points back to markdown lists
            .replace(/^•\s+(.+)$/gm, '- $1')
            // Convert numbered items back to numbered lists
            .replace(/^(\d+)\.\s+(.+)$/gm, '$1. $2')
            // Add proper line breaks
            .replace(/\n\n/g, '\n\n')
            .trim();

        console.log('Final converted markdown:', {
            originalLength: plainText.length,
            markdownLength: result.length,
            preview: result.substring(0, 200)
        });

        return result;
    };

    // Helper function to calculate text similarity
    const calculateTextSimilarity = (text1: string, text2: string) => {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        const commonWords = words1.filter(word => words2.includes(word));
        return commonWords.length / Math.max(words1.length, words2.length);
    };

    // Initialize edit content when response changes
    useEffect(() => {
        const currentResponse = conversations.length - 1 === i && answerMessage !== '' ? answerMessage : m?.response || '';
        // Store original markdown
        setOriginalMarkdown(currentResponse);
        // Convert any existing <u> tags to ==text== syntax for cleaner editing
        const cleanedResponse = currentResponse.replace(/<u>(.*?)<\/u>/gi, '==$1==');
        
        // Always start in markdown mode and show markdown content
        setViewMode('markdown');
        setEditContent(cleanedResponse);
        console.log('ChatResponse - Initialized in markdown mode with content:', cleanedResponse.substring(0, 100));
    }, [m?.response, answerMessage, conversations.length, i]);

    // Handle inline editing - now opens EditResponseModal
    const handleInlineEdit = () => {
        if (!privateChat || loading || !onOpenEditModal) return;
        onOpenEditModal(m?.id, m?.response || '');
    };

    const handleInlineSave = async () => {
        try {
            console.log('=== SAVE DEBUG ===');

            console.log('Save debug info:', {
                originalMarkdown: originalMarkdown?.substring(0, 100),
                editContent: editContent?.substring(0, 100),
                currentResponse: m?.response?.substring(0, 100)
            });

            // Always save in markdown format
            let finalContent = editContent.trim();

            console.log('Save mode:', viewMode);
            console.log('Edit content before conversion:', finalContent.substring(0, 100));
            console.log('Original markdown available:', originalMarkdown?.substring(0, 100));

            // If we're in plain text view, save the original markdown (since plain text is read-only)
            if (viewMode === 'plaintext') {
                // In plain text mode, we save the original markdown content
                if (originalMarkdown) {
                    finalContent = originalMarkdown.trim();
                    console.log('Saving original markdown from plain text mode:', finalContent.substring(0, 100));
                } else {
                    // Fallback: use current content
                    finalContent = editContent.trim();
                    console.log('Saving current content as fallback:', finalContent.substring(0, 100));
                }
            } else {
                // If we're in markdown mode, use the edited content as is
                finalContent = editContent.trim();
                console.log('Saving markdown content directly:', finalContent.substring(0, 100));
            }

            // Convert ==text== back to <u>text</u> before saving
            finalContent = finalContent.replace(/==(.*?)==/g, '<u>$1</u>');

            console.log('Final content to save:', finalContent?.substring(0, 100));

            console.log('Save condition check:', {
                onResponseUpdateExists: !!onResponseUpdate,
                finalContentLength: finalContent?.length,
                currentResponseLength: m?.response?.length,
                contentsAreDifferent: finalContent !== m?.response,
                messageId: m?.id
            });

            if (onResponseUpdate && finalContent !== m?.response) {
                console.log('Calling onResponseUpdate with:', m?.id, finalContent?.substring(0, 50));
                await onResponseUpdate(m?.id, finalContent);
                // Notify parent that response was edited
                if (onResponseEdited) {
                    onResponseEdited(m?.id);
                }
                console.log('Response updated successfully');
            } else {
                console.log('No update needed or onResponseUpdate not available', {
                    hasOnResponseUpdate: !!onResponseUpdate,
                    contentsDifferent: finalContent !== m?.response
                });
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving response:', error);
            alert('Failed to save changes. Please try again.');
        }
    };

    const handleInlineCancel = () => {
        setIsEditing(false);
        setEditContent(m?.response || '');
    };

    const handleInlineKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleInlineCancel();
        }
    };

    // Handle click outside to close
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleInlineCancel();
        }
    };

    const handleInlineChange = (e) => {
        setEditContent(e.target.value);
    };
   
    return m?.response?.startsWith('images') ? (
        <DallEImagePreview
            conversations={conversations}
            i={i}
            loading={loading}
            answerMessage={answerMessage}
            response={m.response}
        />
    ) : (
        <div className="flex flex-col items-start gap-4 break-words min-h-5">
            <div 
                className={`chat-content relative ${
                    m?.responseAPI !== API_TYPE_OPTIONS.PRO_AGENT ? 'max-w-[calc(100vw-95px)] lg:max-w-none' : ''
                } w-full break-words text-font-14 md:text-font-16 leading-7 tracking-[0.16px]`}
            >
            {conversations.length - 1 === i ? (
                <>
                    {loading ? (
                        <StreamingChatLoaderOption code={m.responseAPI} loading={loading} proAgentCode={proAgentCode} />
                    ) : answerMessage !== '' ? (
                        isEditing ? (
                            <div className="inline-editable-response fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
                                <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 rounded-lg overflow-hidden">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">Edit Response</h3>
                                                <p className="text-sm text-gray-500">Edit markdown directly - use toolbar for quick formatting</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleInlineCancel}
                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                                            title="Close (Esc)"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    {/* Content Area */}
                                    <div className="flex-1 overflow-hidden bg-gray-50">
                                        <div className="h-full p-6">
                                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
                                                {/* Formatting Toolbar */}
                                                <div className="flex items-center gap-1 p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                                                    <button
                                                        onClick={() => applyFormatting('bold')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Bold"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M3 2v16h7.5c2.5 0 4.5-2 4.5-4.5 0-1.5-.7-2.8-1.8-3.5C14.3 9.2 15 8 15 6.5 15 4 13 2 10.5 2H3zm3 2h4.5c1.4 0 2.5 1.1 2.5 2.5S11.9 9 10.5 9H6V4zm0 7h5.5c1.4 0 2.5 1.1 2.5 2.5S12.9 16 11.5 16H6v-5z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('italic')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Italic"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M7 2v2h2.5l-3 12H4v2h9v-2H10.5l3-12H16V2H7z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('underline')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Underline"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M6 2v8c0 2.2 1.8 4 4 4s4-1.8 4-4V2h-2v8c0 1.1-.9 2-2 2s-2-.9-2-2V2H6zm-2 16h12v2H4v-2z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('code')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Code"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('header')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Header"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M2 4v2h2v8H2v2h6v-2H6V10h4v4H8v2h6v-2h-2V6h2V4H8v2h2v2H6V6h2V4H2z"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                                
                                                {/* Text Editor */}
                                                <div className="flex-1">
                                                <TextAreaBox
                                                    message={editContent}
                                                    handleChange={handleInlineChange}
                                                    handleKeyDown={handleInlineKeyDown}
                                                    isDisable={false}
                                                        className="w-full h-full min-h-[450px] border-0 focus:ring-0 focus:outline-none p-6 text-sm leading-relaxed resize-none bg-transparent font-normal"
                                                    placeholder="Edit your response here..."
                                                    ref={textareaRef}
                                                />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Footer */}
                                    <div className="px-6 py-4 border-t border-gray-200 bg-white">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Press Esc to cancel
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={handleInlineCancel}
                                                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleInlineSave}
                                                    className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm flex items-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative group">
                                <div 
                                    className="rounded-lg p-3"
                                >
                                    {MarkOutPut(answerMessage)}
                                </div>
                            </div>
                        )
                    ) : (
                        //when stream response give done we empty answerMessage and show m.response (so in DB )
                        <>
                            {isEditing ? (
                                <div className="inline-editable-response fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
                                    <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 rounded-lg overflow-hidden">
                                        {/* Header */}
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">Edit Response</h3>
                                                    <p className="text-sm text-gray-500">Modify your AI response below</p>
                                                </div>
                                            </div>
                                            {/* View Toggle Button */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex bg-gray-100 rounded-lg p-1 shadow-sm border border-gray-200">
                                                    <button
                                                        onClick={() => handleViewModeToggle('plaintext')}
                                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                                            viewMode === 'plaintext'
                                                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                            </svg>
                                                            Plain Text
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewModeToggle('markdown')}
                                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                                            viewMode === 'markdown'
                                                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                            </svg>
                                                            Edit Content
                                                        </div>
                                                    </button>
                                                </div>
                                                
                                                    <button
                                                        onClick={handleInlineCancel}
                                                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                                                        title="Close (Esc)"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                            </div>
                                        </div>
                                        
                                        {/* Content Area */}
                                        <div className="flex-1 overflow-hidden bg-gray-50">
                                            <div className="h-full p-6">
                                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">
                                                    {/* Formatting Toolbar - Only show in markdown mode */}
                                                    {viewMode === 'markdown' && (
                                                        <div className="flex items-center gap-1 p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                                                            <button
                                                                onClick={() => applyFormatting('bold')}
                                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                                title="Bold"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M3 2v16h7.5c2.5 0 4.5-2 4.5-4.5 0-1.5-.7-2.8-1.8-3.5C14.3 9.2 15 8 15 6.5 15 4 13 2 10.5 2H3zm3 2h4.5c1.4 0 2.5 1.1 2.5 2.5S11.9 9 10.5 9H6V4zm0 7h5.5c1.4 0 2.5 1.1 2.5 2.5S12.9 16 11.5 16H6v-5z"/>
                                                                </svg>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => applyFormatting('italic')}
                                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                                title="Italic"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M7 2v2h2.5l-3 12H4v2h9v-2H10.5l3-12H16V2H7z"/>
                                                                </svg>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => applyFormatting('underline')}
                                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                                title="Underline"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M6 2v8c0 2.2 1.8 4 4 4s4-1.8 4-4V2h-2v8c0 1.1-.9 2-2 2s-2-.9-2-2V2H6zm-2 16h12v2H4v-2z"/>
                                                                </svg>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => applyFormatting('code')}
                                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                                title="Code"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                                                                </svg>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => applyFormatting('header')}
                                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                                title="Header"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M2 4v2h2v8H2v2h6v-2H6V10h4v4H8v2h6v-2h-2V6h2V4H8v2h2v2H6V6h2V4H2z"/>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Text Editor */}
                                                    <div className="flex-1 overflow-hidden">
                                                        {viewMode === 'markdown' ? (
                                                                    <TextAreaBox
                                                                        message={editContent}
                                                                        handleChange={handleInlineChange}
                                                                        handleKeyDown={handleInlineKeyDown}
                                                                        isDisable={false}
                                                                className="w-full h-full min-h-[450px] border-0 focus:ring-0 focus:outline-none p-6 text-sm leading-relaxed resize-none bg-transparent font-mono overflow-auto"
                                                                placeholder="Edit your markdown content here..."
                                                                        ref={textareaRef}
                                                                    />
                                                        ) : (
                                                            <div className="relative group">
                                                                <div 
                                                                    className="w-full h-full min-h-[450px] p-6 text-sm leading-relaxed bg-gray-50 border border-gray-200 rounded-md overflow-auto"
                                                                    style={{
                                                                        maxHeight: '450px',
                                                                        overflowY: 'scroll',
                                                                        overflowX: 'hidden'
                                                                    }}
                                                                >
                                                                    <div 
                                                                        className="whitespace-pre-wrap text-gray-800 font-normal"
                                                                        dangerouslySetInnerHTML={{ __html: markdownToPlainText(originalMarkdown || editContent) }}
                                                                    />
                                                                </div>
                                                                <div
                                                                    onClick={() => {
                                                                        // Copy actual plain text without HTML tags
                                                                        const plainText = markdownToPlainText(originalMarkdown || editContent)
                                                                            .replace(/<[^>]*>/g, '') // Remove HTML tags
                                                                            .replace(/&nbsp;/g, ' ') // Replace HTML entities
                                                                            .replace(/&amp;/g, '&')
                                                                            .replace(/&lt;/g, '<')
                                                                            .replace(/&gt;/g, '>');
                                                                        navigator.clipboard.writeText(plainText).then(() => {
                                                                            // Show a brief success indicator
                                                                            const icon = document.querySelector('[data-copy-icon]');
                                                                            if (icon) {
                                                                                const originalIcon = icon.innerHTML;
                                                                                icon.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                                                                                icon.classList.add('text-green-500');
                                                                                setTimeout(() => {
                                                                                    icon.innerHTML = originalIcon;
                                                                                    icon.classList.remove('text-green-500');
                                                                                }, 2000);
                                                                            }
                                                                        }).catch(err => {
                                                                            console.error('Failed to copy text: ', err);
                                                                            alert('Failed to copy text to clipboard');
                                                                        });
                                                                    }}
                                                                    data-copy-icon
                                                                    className="absolute top-3 right-3 cursor-pointer text-gray-400 hover:text-gray-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                                                    title="Copy plain text to clipboard"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Footer */}
                                        <div className="px-6 py-4 border-t border-gray-200 bg-white">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {viewMode === 'markdown' 
                                                        ? 'Editing in Markdown mode • Press Esc to cancel'
                                                        : 'Viewing in Plain Text mode (read-only) • Press Esc to cancel'
                                                    }
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={handleInlineCancel}
                                                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleInlineSave}
                                                        className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group">
                                    <div 
                                        className="rounded-lg p-3"
                                    >
                                        {MarkOutPut(m.response)}
                                    </div>
                                </div>
                            )}
                            {
                                m?.responseAddKeywords?.hasOwnProperty(PAGE_SPEED_RECORD_KEY) 
                                ? <PageSpeedResponse response={m?.responseAddKeywords} /> : m?.responseAddKeywords?.hasOwnProperty('file_url') 
                                ? <div className="mt-4">{MarkOutPut(m.responseAddKeywords.file_url)}</div> : ''
                            }
                            {
                                m?.responseAddKeywords?.hasOwnProperty(WEB_RESOURCES_DATA) && <ShowResources response={m?.responseAddKeywords as any} />
                            }
                        </>
                    )}
                    {
                        (m?.responseAPI === API_TYPE_OPTIONS.PRO_AGENT && isStreamingLoading && answerMessage.length > 0) && (
                            <div className="my-2 animate-pulse text-font-14 font-bold inline-block">
                                <p>Checking next step...</p>
                            </div>   
                        )
                    }
                </>
            ) : (
                <>
                                        {isEditing ? (
                        <div className="inline-editable-response fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
                            <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 rounded-lg overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Edit Response</h3>
                                            <p className="text-sm text-gray-500">Modify your AI response below</p>
                                        </div>
                                    </div>
                                    {/* View Toggle Button */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex bg-gray-100 rounded-lg p-1 shadow-sm border border-gray-200">
                                            <button
                                                onClick={() => handleViewModeToggle('plaintext')}
                                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                                    viewMode === 'plaintext'
                                                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                    </svg>
                                                    Plain Text
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => handleViewModeToggle('markdown')}
                                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                                    viewMode === 'markdown'
                                                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                    </svg>
                                                    Edit Content
                                                </div>
                                            </button>
                                        </div>
                                        
                                            <button
                                                onClick={handleInlineCancel}
                                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                                                title="Close (Esc)"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                    </div>
                                </div>
                                
                                {/* Content Area */}
                                <div className="flex-1 overflow-hidden bg-gray-50">
                                    <div className="h-full p-6">
                                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">
                                            {/* Formatting Toolbar - Only show in markdown mode */}
                                            {viewMode === 'markdown' && (
                                                <div className="flex items-center gap-1 p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                                                    <button
                                                        onClick={() => applyFormatting('bold')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Bold"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M3 2v16h7.5c2.5 0 4.5-2 4.5-4.5 0-1.5-.7-2.8-1.8-3.5C14.3 9.2 15 8 15 6.5 15 4 13 2 10.5 2H3zm3 2h4.5c1.4 0 2.5 1.1 2.5 2.5S11.9 9 10.5 9H6V4zm0 7h5.5c1.4 0 2.5 1.1 2.5 2.5S12.9 16 11.5 16H6v-5z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('italic')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Italic"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M7 2v2h2.5l-3 12H4v2h9v-2H10.5l3-12H16V2H7z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('underline')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Underline"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M6 2v8c0 2.2 1.8 4 4 4s4-1.8 4-4V2h-2v8c0 1.1-.9 2-2 2s-2-.9-2-2V2H6zm-2 16h12v2H4v-2z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('code')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Code"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('header')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Header"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M2 4v2h2v8H2v2h6v-2H6V10h4v4H8v2h6v-2h-2V6h2V4H8v2h2v2H6V6h2V4H2z"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {/* Text Editor */}
                                            <div className="flex-1 overflow-hidden">
                                                {viewMode === 'markdown' ? (
                                                            <TextAreaBox
                                                                message={editContent}
                                                                handleChange={handleInlineChange}
                                                                handleKeyDown={handleInlineKeyDown}
                                                                isDisable={false}
                                                        className="w-full h-full min-h-[450px] border-0 focus:ring-0 focus:outline-none p-6 text-sm leading-relaxed resize-none bg-transparent font-mono overflow-auto"
                                                        placeholder="Edit your markdown content here..."
                                                                ref={textareaRef}
                                                            />
                                                ) : (
                                                    <div className="relative group">
                                                        <div 
                                                            className="w-full h-full min-h-[450px] p-6 text-sm leading-relaxed bg-gray-50 border border-gray-200 rounded-md overflow-auto"
                                                            style={{
                                                                maxHeight: '450px',
                                                                overflowY: 'scroll',
                                                                overflowX: 'hidden'
                                                            }}
                                                        >
                                                            <div 
                                                                className="whitespace-pre-wrap text-gray-800 font-normal"
                                                                dangerouslySetInnerHTML={{ __html: markdownToPlainText(originalMarkdown || editContent) }}
                                                            />
                                                        </div>
                                                        <div
                                                            onClick={() => {
                                                                // Copy actual plain text without HTML tags
                                                                const plainText = markdownToPlainText(originalMarkdown || editContent)
                                                                    .replace(/<[^>]*>/g, '') // Remove HTML tags
                                                                    .replace(/&nbsp;/g, ' ') // Replace HTML entities
                                                                    .replace(/&amp;/g, '&')
                                                                    .replace(/&lt;/g, '<')
                                                                    .replace(/&gt;/g, '>');
                                                                navigator.clipboard.writeText(plainText).then(() => {
                                                                    // Show a brief success indicator
                                                                    const icon = document.querySelector('[data-copy-icon]');
                                                                    if (icon) {
                                                                        const originalIcon = icon.innerHTML;
                                                                        icon.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                                                                        icon.classList.add('text-green-500');
                                                                        setTimeout(() => {
                                                                            icon.innerHTML = originalIcon;
                                                                            icon.classList.remove('text-green-500');
                                                                        }, 2000);
                                                                    }
                                                                }).catch(err => {
                                                                    console.error('Failed to copy text: ', err);
                                                                    alert('Failed to copy text to clipboard');
                                                                });
                                                            }}
                                                            data-copy-icon
                                                            className="absolute top-3 right-3 cursor-pointer text-gray-400 hover:text-gray-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                                            title="Copy plain text to clipboard"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Footer */}
                                <div className="px-6 py-4 border-t border-gray-200 bg-white">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {viewMode === 'markdown' 
                                                ? 'Editing in Markdown mode • Press Esc to cancel'
                                                : 'Viewing in Plain Text mode (read-only) • Press Esc to cancel'
                                            }
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleInlineCancel}
                                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleInlineSave}
                                                className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative group">
                            <div 
                                className="rounded-lg p-3"
                            >
                                {MarkOutPut(m.response)}
                            </div>
                        </div>
                    )}
                    {
                        m?.responseAddKeywords?.hasOwnProperty(PAGE_SPEED_RECORD_KEY) && <PageSpeedResponse response={m?.responseAddKeywords} />
                    }
                    {
                        m?.responseAddKeywords?.hasOwnProperty(WEB_RESOURCES_DATA) && <ShowResources response={m?.responseAddKeywords as any} />
                    }
                </>
            )}
            {/* {showRefineButton && (
                <button 
                className='btn btn-black min-w-[100px] px-3 py-[5px]'
                    style={{ ...buttonPosition }} 
                    onMouseDown={(e) => e.preventDefault()} 
                    onClick={handleAskWeam}
                >
                    Edit selected text
                </button>
            )} */}
    
            {/* Show the textbox if the button was clicked */}
            { privateChat && showCanvasBox && selectedId === m?.id && (
                <CanvasInput inputPosition={inputPosition} handleDeSelectionChanges={handleDeSelectionChanges} handleSubmitPrompt={handleSubmitPrompt}/>
            )}
        </div>
    </div>
    );
};

export default React.memo(ChatResponse);
