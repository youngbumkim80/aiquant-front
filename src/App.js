import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { marked } from 'marked';
import {
  Copy, ArrowRight, Upload, FolderOpen, Bot, User, BrainCircuit, History, Lightbulb, Image, BarChart2, CheckCircle, XCircle, ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, doc, updateDoc } from 'firebase/firestore';
import DOMPurify from 'dompurify';

// Firebase 환경 변수 (Canvas에서 자동 주입)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// 백엔드 URL
const backendUrl = 'https://ai-quant-system-backend-1046097607449.asia-northeast3.run.app';

// Admin Panel 컴포넌트
const AdminPanel = ({ isOpen, onClose, onPatchSubmit, isLoading }) => {
  const [password, setPassword] = useState('');
  const [patchCode, setPatchCode] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await fetch(`${backendUrl}/api/patch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, patchCode }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '패치 적용 실패');
      }
      setMessage(result.message);
    } catch (e) {
      setMessage(e.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold text-slate-800">관리자 패널</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-800 transition-colors text-2xl">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-600 font-medium mb-1">관리자 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">패치 코드</label>
            <textarea
              value={patchCode}
              onChange={(e) => setPatchCode(e.target.value)}
              rows="8"
              className="w-full p-3 bg-slate-100 border border-slate-300 rounded-lg font-mono text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-full font-medium shadow-lg hover:bg-indigo-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? '패치 적용 중...' : '패치 적용'}
          </button>
        </form>
        {message && (
          <div className={`mt-4 p-4 rounded-lg text-sm whitespace-pre-wrap ${message.includes('성공') ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

// 파일 목록 모달 컴포넌트 (트리 구조)
const FileListModal = ({ isOpen, onClose, files, onSetActiveFile }) => {
  const [expandedYears, setExpandedYears] = useState({});

  if (!isOpen) return null;

  const toggleYear = (year) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };
  
  const fileTypes = Object.keys(files).sort();

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 max-w-4xl w-full h-3/4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-semibold text-slate-800">업로드된 파일 목록</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-800 transition-colors text-2xl">
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 rounded-lg border border-slate-300 font-mono text-sm text-slate-600">
          <ul className="space-y-4">
            {fileTypes.length > 0 ? (
              fileTypes.map(fileType => (
                <li key={fileType} className="bg-white p-4 rounded-lg">
                  <h3 className="text-xl font-semibold text-indigo-600 mb-2">{fileType.toUpperCase()} 파일</h3>
                  <ul className="space-y-4 pl-4">
                    {Object.keys(files[fileType]).sort().reverse().map(year => (
                      <li key={`${fileType}-${year}`}>
                        <div className="flex items-center cursor-pointer text-lg font-medium text-slate-800 mb-1 hover:text-indigo-600" onClick={() => toggleYear(year)}>
                          {expandedYears[year] ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRightIcon className="w-4 h-4 mr-2" />}
                          {year}년
                        </div>
                        {expandedYears[year] && (
                          <ul className="space-y-2 pl-8 text-slate-600">
                            {Object.keys(files[fileType][year]).sort().reverse().map(month => (
                              <li key={`${fileType}-${year}-${month}`}>
                                <h5 className="text-base font-normal text-slate-700 mb-1">{month}월</h5>
                                <ul className="space-y-1 pl-4">
                                  {files[fileType][year][month].map((file, index) => (
                                    <li
                                      key={index}
                                      className="p-2 bg-slate-200 rounded-md hover:bg-slate-300 cursor-pointer transition-colors"
                                      onClick={() => {
                                        onSetActiveFile(file);
                                        onClose();
                                      }}
                                    >
                                      {file.name} ({file.size > 1024 ? `${(file.size / 1024).toFixed(2)} KB` : `${file.size} Bytes`})
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))
            ) : (
              <li className="text-center text-slate-500 italic">업로드된 파일이 없습니다.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

// 파일 내용 미리보기 모달 컴포넌트
const FileContentModal = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 max-w-4xl w-full h-3/4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-semibold text-slate-800">파일 내용 미리보기</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-800 transition-colors text-2xl">
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 rounded-lg border border-slate-300 font-mono text-sm text-slate-600">
          <pre className="whitespace-pre-wrap">{data}</pre>
        </div>
      </div>
    </div>
  );
};

// 백테스트 결과 카드 컴포넌트
const ResultCardBacktest = ({ data }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 max-w-xl w-full animate-fade-in">
    <h3 className="text-xl font-semibold text-slate-700 mb-4 flex items-center"><History className="mr-2 text-indigo-600"/>백테스트 결과</h3>
    <div className="grid grid-cols-2 gap-4 text-center mb-6">
      <div><p className="text-sm text-slate-500">총 수익률</p><p className={`text-2xl font-bold ${data.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>{data.totalReturn.toFixed(2)}%</p></div>
      <div><p className="text-sm text-slate-500">최종 자산</p><p className="text-2xl font-bold text-slate-800">{Math.round(data.finalValue).toLocaleString()}원</p></div>
      <div><p className="text-sm text-slate-500">총 거래 횟수</p><p className="text-2xl font-bold text-slate-800">{data.tradeCount}회</p></div>
      <div><p className="text-sm text-slate-500">최대 낙폭 (MDD)</p><p className="text-2xl font-bold text-slate-800">{data.maxDrawdown.toFixed(2)}%</p></div>
    </div>
  </div>
);

// 시각화 결과 카드 컴포넌트
const ResultCardVisualization = ({ url }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 max-w-xl w-full animate-fade-in">
    <h3 className="text-xl font-semibold text-slate-700 mb-4 flex items-center"><Image className="mr-2 text-indigo-600"/>시각화 차트</h3>
    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
      <img src={url} alt="Generated Chart" className="w-full h-auto" />
    </div>
  </div>
);

// 메인 App 컴포넌트
const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [activeFile, setActiveFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isFileListModalOpen, setIsFileListModalOpen] = useState(false);
  const [isFileContentModalOpen, setIsFileContentModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('온라인');
  
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);

  const chatboxRef = useRef(null);
  const inputRef = useRef(null);

  // Firebase 초기화 및 인증
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const firestoreDb = getFirestore(app);
    const firestoreAuth = getAuth(app);
    setDb(firestoreDb);

    const unsubscribe = onAuthStateChanged(firestoreAuth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(firestoreAuth, initialAuthToken);
          } else {
            const anonymousUser = await signInAnonymously(firestoreAuth);
            setUserId(anonymousUser.user.uid);
          }
        } catch (authError) {
          console.error("Firebase 인증 오류:", authError);
          setUserId(crypto.randomUUID());
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Firebase로부터 대화 기록 불러오기 (onSnapshot 사용)
  useEffect(() => {
    if (!db || !userId) return;
    const chatCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/chats`);
    const q = query(chatCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatHistory = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      chatHistory.sort((a, b) => (a.timestamp?.toDate() || 0) - (b.timestamp?.toDate() || 0));
      setMessages(chatHistory);
    }, (error) => {
      console.error("Firebase 대화 기록 불러오기 오류:", error);
      setError('대화 기록을 불러오는 데 실패했습니다.');
    });

    return () => unsubscribe();
  }, [db, userId]);

  // 스크롤을 항상 맨 아래로 이동시키는 효과
  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  // 엔터 키 입력 핸들러
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };
    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('keypress', handleKeyPress);
    }
    return () => {
      if (inputElement) {
        inputElement.removeEventListener('keypress', handleKeyPress);
      }
    };
  }, [input, isLoading]);

  // 입력창 높이 자동 조절
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || !db || !userId || isLoading) return;

    if (Object.keys(uploadedFiles).length === 0) {
      setError('분석할 파일이 없습니다. 파일을 먼저 업로드해주세요.');
      return;
    }

    const chatCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/chats`);
    const userMessage = { type: 'user', content: input, timestamp: serverTimestamp() };
    await addDoc(chatCollectionRef, userMessage);
    
    const userPrompt = input;
    setInput('');
    setIsLoading(true);
    setConnectionStatus('파일 분석 중...');

    const allFiles = Object.values(uploadedFiles).flatMap(fileType =>
      Object.values(fileType).flatMap(year =>
        Object.values(year).flatMap(month => month)
      )
    );

    try {
      const filesMetadata = allFiles.map(file => ({
        name: file.name,
        url: file.url,
        size: file.size,
        type: file.type,
      }));

      const response = await fetch(`${backendUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          history: messages,
          uploaded_files: filesMetadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '네트워크 오류 발생');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = '';
      let aiMessageContent = '';
      let placeholderMessageId = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
    
        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop();
    
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'text') {
                if (!placeholderMessageId) {
                  const docRef = await addDoc(chatCollectionRef, { type: 'ai', content: data.content, timestamp: new Date() });
                  placeholderMessageId = docRef.id;
                } else {
                  await updateDoc(doc(chatCollectionRef, placeholderMessageId), { content: aiMessageContent + data.content });
                }
                aiMessageContent += data.content;
              } else {
                const resultMessage = { type: `result_${data.type}`, content: data.content, data: data.data, url: data.url, timestamp: serverTimestamp() };
                await addDoc(chatCollectionRef, resultMessage);
              }
            } catch (parseError) {
              console.error('Failed to parse JSON:', parseError, 'line:', line);
            }
          }
        }
      }
    
      if (placeholderMessageId) {
        await updateDoc(doc(chatCollectionRef, placeholderMessageId), { content: aiMessageContent, timestamp: serverTimestamp() });
      } else if (aiMessageContent) {
        await addDoc(chatCollectionRef, { type: 'ai', content: aiMessageContent, timestamp: serverTimestamp() });
      }

    } catch (e) {
      console.error('Streaming fetch error:', e);
      setError(e.message);
      await addDoc(chatCollectionRef, { type: 'ai', content: `오류가 발생했습니다: ${e.message}`, timestamp: serverTimestamp() });
    } finally {
      setIsLoading(false);
      setConnectionStatus('온라인');
    }
  };

  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files.length) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      
      fetch(`${backendUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      })
      .then(response => response.json())
      .then(result => {
        if (result.error) {
          throw new Error(result.error);
        }
        
        const fileType = file.name.split('.').pop().toLowerCase();
        const match = file.name.match(/^(\d{4})_(\d{2})_(\d{2})/);
        const year = match ? match[1] : '분류되지 않음';
        const month = match ? match[2] : '분류되지 않음';

        setUploadedFiles(prev => {
          const newFiles = { ...prev };
          if (!newFiles[fileType]) newFiles[fileType] = {};
          if (!newFiles[fileType][year]) newFiles[fileType][year] = {};
          if (!newFiles[fileType][year][month]) newFiles[fileType][year][month] = [];
          
          newFiles[fileType][year][month].push({ name: file.name, ...result });
          return newFiles;
        });

        const systemMessage = { type: 'system', content: `파일 '${file.name}'이 성공적으로 업로드되었습니다.`, timestamp: serverTimestamp() };
        if (db && userId) {
          const chatCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/chats`);
          addDoc(chatCollectionRef, systemMessage);
        }
      })
      .catch(err => {
        console.error('File upload failed:', err);
        setError(`파일 업로드 실패: ${err.message}`);
      });
    }
  };
  
  const handlePatchSubmit = async (patchData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/patch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchData),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '패치 적용 실패');
      }
      return { message: result.message };
    } catch (e) {
      return { message: `오류: ${e.message}` };
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      const systemMessage = { type: 'system', content: '클립보드에 복사되었습니다.', timestamp: serverTimestamp() };
      if (db && userId) {
        const chatCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/chats`);
        addDoc(chatCollectionRef, systemMessage);
      }
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
    document.body.removeChild(textarea);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'user': return <User className="w-6 h-6 text-slate-600" />;
      case 'ai': return <Bot className="w-6 h-6 text-slate-600" />;
      case 'system': return <CheckCircle className="w-6 h-6 text-green-600" />;
      default: return <BrainCircuit className="w-6 h-6 text-slate-600" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-800 font-sans antialiased">
      <div className="w-full h-full flex bg-white rounded-2xl shadow-2xl m-4 overflow-hidden">
        {/* Left Panel: Chat */}
        <div className="w-2/5 flex flex-col border-r border-slate-200">
          <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg"><BrainCircuit className="text-indigo-600" /></div>
              <h1 className="text-xl font-bold text-slate-800">AI 퀀트 시스템</h1>
            </div>
            <div className="flex items-center text-sm text-slate-500">
              <div className={`w-2.5 h-2.5 rounded-full mr-2 ${connectionStatus === '온라인' ? 'bg-green-500' : connectionStatus === '파일 분석 중...' ? 'bg-indigo-500' : 'bg-yellow-500 animate-pulse'}`}></div>
              <span id="status-text">{connectionStatus}</span>
            </div>
          </header>
          <main ref={chatboxRef} className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-500 italic mt-10 flex flex-col items-center">
                <BarChart2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                AI퀀트 시스템과 대화를 시작해보세요.
              </div>
            )}
            {messages.map((msg) => {
              if (msg.type === 'user' || msg.type === 'ai' || msg.type === 'system') {
                const isUser = msg.type === 'user';
                return (
                  <div key={msg.id} className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''} animate-fade-in`}>
                    <div className="p-2 bg-slate-200 rounded-full flex-shrink-0">{getIcon(msg.type)}</div>
                    <div className={`p-4 rounded-lg max-w-xl prose ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-200 text-slate-800 rounded-tl-none'}`}>
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(msg.content)) }} />
                      {msg.type === 'ai' && (
                        <div className="mt-2 flex space-x-2">
                          <button
                            onClick={() => copyToClipboard(msg.content)}
                            className="flex items-center gap-1 px-3 py-1 bg-slate-500 text-white rounded-full text-xs hover:bg-slate-600 transition-colors"
                          >
                            <Copy className="w-3 h-3" /> 복사
                          </button>
                          <button
                            onClick={() => setInput(msg.content)}
                            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-full text-xs hover:bg-indigo-700 transition-colors"
                          >
                            <ArrowRight className="w-3 h-3" /> 적용
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else if (msg.type === 'result_backtest') {
                return (
                  <div key={msg.id} className="flex justify-center my-4 animate-fade-in">
                    <ResultCardBacktest data={msg.data} />
                  </div>
                );
              } else if (msg.type === 'result_visualization') {
                return (
                  <div key={msg.id} className="flex justify-center my-4 animate-fade-in">
                    <ResultCardVisualization url={msg.url} />
                  </div>
                );
              }
              return null;
            })}
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="p-2 bg-slate-200 rounded-full flex-shrink-0"><Bot className="w-6 h-6 text-slate-600" /></div>
                <div className="p-4 rounded-lg max-w-xl bg-slate-200 text-slate-800 rounded-tl-none">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse delay-75"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </main>
          <footer className="p-4 border-t flex flex-col gap-3 flex-shrink-0">
            <div className="flex gap-2">
              <label htmlFor="file-upload" className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
                <Upload className="w-5 h-5 mr-2" /> 파일 업로드
              </label>
              <button onClick={() => setIsFileListModalOpen(true)} className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 flex items-center">
                <FolderOpen className="w-5 h-5 mr-2" /> 파일 목록
              </button>
              <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} multiple accept=".csv" />
            </div>
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="AI에게 요청을 입력하세요."
                rows="1"
                className="flex-1 p-3 bg-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                disabled={isLoading}
              ></textarea>
              <button
                type="submit"
                onClick={handleSend}
                className="w-12 h-12 bg-indigo-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center flex-shrink-0"
                disabled={isLoading}
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </footer>
        </div>
        
        {/* Right Panel: Analysis Results */}
        <div id="result-panel" className="w-3/5 overflow-y-auto p-8 bg-slate-50">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart2 className="text-indigo-600" /> 분석 결과
          </h2>
          <div className="text-center text-slate-500 italic mt-10">
            분석 결과는 대화창에 카드 형태로 나타납니다.
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        onPatchSubmit={handlePatchSubmit}
        isLoading={isLoading}
      />
      <FileListModal
        isOpen={isFileListModalOpen}
        onClose={() => setIsFileListModalOpen(false)}
        files={uploadedFiles}
        onSetActiveFile={setActiveFile}
      />
      <FileContentModal
        isOpen={isFileContentModalOpen}
        onClose={() => setIsFileContentModalOpen(false)}
        data={activeFile ? activeFile.preview : null}
      />
    </div>
  );
};

export default App;
