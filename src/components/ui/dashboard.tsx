import React, { useState, useRef, useEffect } from 'react';
import { serializeGift } from '../../App';
import { StitchEngine } from './stitch-engine';
import { MatrixRain } from './matrix-rain';
import { WaveformTimeline } from './waveform-timeline';
import { 
  Upload, 
  Trash2, 
  Play, 
  Pause, 
  User,
  Music,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Plus,
  Image as ImageIcon,
  Undo,
  Redo
} from 'lucide-react';

export type StitchStyle = 'matrix_rain' | 'anime_vignette';

export interface UploadedImage {
  id: string;
  name: string;
  src: string;
  contrast: number;      // Bounds: 0.5 - 2.0
  brightness: number;    // Bounds: -50 - 50
  cropZoom: number;      // Bounds: 0.1 - 10.0
  cropOffsetX: number;   // Bounds: -500 to 500
  cropOffsetY: number;   
}

export interface LyricSection {
  id: string;
  start: number;         
  end: number;           
  text: string;          
  imageId: string;
  style: StitchStyle;    
  scrollSpeed: number;   
}

interface DashboardProps {
  onPreview: (data: {
    recipientName: string;
    outroMessage: string;
    outroFont: string;
    images: UploadedImage[];
    lyrics: LyricSection[];
    audioUrl: string;
    masterCropStart: number;
    masterCropEnd: number;
    stylePreset: StitchStyle;
  }) => void;
}

const DEFAULT_AUDIO_OPTIONS = [
  { name: "Neon Nocturne (Ethereal Synth)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { name: "Midnight Solitude (Ambient Piano)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { name: "Cipher Stream (Tech Noir Beat)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
];

const SONG_CACHE_PREFIX = 'tsuki-yo-song:';
const LYRIC_CACHE_PREFIX = 'tsuki-yo-lyrics:';

type CachedSong = {
  id: string;
  artist: string;
  trackName: string;
  audioUrl: string;
  artworkUrl60?: string;
  source: 'search' | 'upload';
  cachedAt: number;
};

type CachedLyrics = {
  id: string;
  artist: string;
  trackName: string;
  lyrics: { absoluteStart: number; text: string }[];
  cachedAt: number;
};

const normalizeTrackKey = (artist: string, trackName: string) => {
  const cleanArtist = artist.trim().toLowerCase();
  const cleanTrack = trackName.trim().toLowerCase();
  return `${cleanArtist}::${cleanTrack}`;
};

const getStorageKey = (prefix: string, artist: string, trackName: string) => `${prefix}${normalizeTrackKey(artist, trackName)}`;

const readCachedValue = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const writeCachedValue = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage write failures
  }
};

const saveCachedSong = (song: CachedSong) => {
  writeCachedValue(getStorageKey(SONG_CACHE_PREFIX, song.artist, song.trackName), song);
};

const getCachedSong = (artist: string, trackName: string): CachedSong | null => {
  return readCachedValue<CachedSong | null>(getStorageKey(SONG_CACHE_PREFIX, artist, trackName), null);
};

const saveCachedLyrics = (lyrics: CachedLyrics) => {
  writeCachedValue(getStorageKey(LYRIC_CACHE_PREFIX, lyrics.artist, lyrics.trackName), lyrics);
};

const getCachedLyrics = (artist: string, trackName: string): CachedLyrics | null => {
  return readCachedValue<CachedLyrics | null>(getStorageKey(LYRIC_CACHE_PREFIX, artist, trackName), null);
};

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `T+ ${m}:${s}`;
};

const detectEyesCenter = (imgEl: HTMLImageElement): { x: number; y: number } => {
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { x: 0.5, y: 0.4 };

  try {
    ctx.drawImage(imgEl, 0, 0, 40, 40);
    const pixels = ctx.getImageData(0, 0, 40, 40).data;

    let bestY = 16;
    let minBrightnessSum = Infinity;

    for (let y = 12; y < 22; y++) {
      let rowBrightness = 0;
      for (let x = 10; x < 30; x++) {
        const idx = (x + y * 40) * 4;
        const gray = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
        rowBrightness += gray;
      }
      if (rowBrightness < minBrightnessSum) {
        minBrightnessSum = rowBrightness;
        bestY = y;
      }
    }

    let bestX = 20;
    let minXBrightness = Infinity;
    for (let x = 12; x < 28; x++) {
      const idx = (x + bestY * 40) * 4;
      const gray = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      if (gray < minXBrightness) {
        minXBrightness = gray;
        bestX = x;
      }
    }

    return { x: bestX / 40, y: bestY / 40 };
  } catch (e) {
    return { x: 0.5, y: 0.4 };
  }
};

export const Dashboard: React.FC<DashboardProps> = ({ onPreview }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // STEP 1 States
  const [recipientName, setRecipientName] = useState('SOPHIA');
  const [outroMessage, setOutroMessage] = useState("I Love ❤️ You Sayang");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string>('');
  const [outroFont, setOutroFont] = useState<string>('modern');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // STEP 2 States & Online Search
  const [audioUrl, setAudioUrl] = useState(DEFAULT_AUDIO_OPTIONS[0].url);
  const [customAudioName, setCustomAudioName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterCropStart, setMasterCropStart] = useState(0);
  const [masterCropEnd, setMasterCropEnd] = useState(180);
  const [masterLyrics, setMasterLyrics] = useState<{ absoluteStart: number; text: string }[]>([]);
  const [lyricOffset, setLyricOffset] = useState(0);

  // QoL improvements states
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [lyricsSearchQuery, setLyricsSearchQuery] = useState('');
  const [lyricsSearchResults, setLyricsSearchResults] = useState<any[]>([]);
  const [isSearchingLyrics, setIsSearchingLyrics] = useState(false);

  // Undo/Redo stack states
  const historyRef = useRef<LyricSection[][]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isRestoringRef = useRef<boolean>(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initial countdown & lyric sequence sections
  const [sections, setSections] = useState<LyricSection[]>([
    { id: 'sec-1', start: 1.0, end: 2.5, text: '3', imageId: '', style: 'matrix_rain', scrollSpeed: 1.0 },
    { id: 'sec-2', start: 3.0, end: 4.5, text: '2', imageId: '', style: 'matrix_rain', scrollSpeed: 1.0 },
    { id: 'sec-3', start: 5.0, end: 6.5, text: '1', imageId: '', style: 'matrix_rain', scrollSpeed: 1.0 },
    { id: 'sec-4', start: 7.0, end: 8.5, text: 'YOU', imageId: '', style: 'matrix_rain', scrollSpeed: 1.0 },
    { id: 'sec-5', start: 9.0, end: 10.5, text: 'ARE', imageId: '', style: 'matrix_rain', scrollSpeed: 1.0 },
    { id: 'sec-6', start: 11.0, end: 12.5, text: 'MY', imageId: '', style: 'matrix_rain', scrollSpeed: 1.0 },
    { id: 'sec-7', start: 13.0, end: 14.5, text: 'LOVE', imageId: '', style: 'matrix_rain', scrollSpeed: 1.0 }
  ]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>('sec-1');

  // STEP 3 Polish & Preview
  const [stylePreset, setStylePreset] = useState<StitchStyle>('matrix_rain');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activePreviewText, setActivePreviewText] = useState('YOU');
  const [activePreviewImage, setActivePreviewImage] = useState<UploadedImage | null>(null);
  const [activePreviewStyle, setActivePreviewStyle] = useState<StitchStyle>('matrix_rain');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Undo/Redo stack utility functions
  const pushHistory = (newSections: LyricSection[]) => {
    const cloned = JSON.parse(JSON.stringify(newSections));
    const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    currentHistory.push(cloned);
    if (currentHistory.length > 30) {
      currentHistory.shift();
    }
    historyRef.current = currentHistory;
    historyIndexRef.current = currentHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const prev = historyRef.current[historyIndexRef.current];
      isRestoringRef.current = true;
      setSections(JSON.parse(JSON.stringify(prev)));
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const next = historyRef.current[historyIndexRef.current];
      isRestoringRef.current = true;
      setSections(JSON.parse(JSON.stringify(next)));
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  };

  // Sync keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step !== 2) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem('tsuki-yo-draft');
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        if (draft.recipientName) setRecipientName(draft.recipientName);
        if (draft.outroMessage) setOutroMessage(draft.outroMessage);
        if (draft.images) setImages(draft.images);
        if (draft.sections) {
          setSections(draft.sections);
          historyRef.current = [JSON.parse(JSON.stringify(draft.sections))];
          historyIndexRef.current = 0;
          setCanUndo(false);
          setCanRedo(false);
        }
        if (draft.audioUrl) setAudioUrl(draft.audioUrl);
        if (draft.masterCropStart !== undefined) setMasterCropStart(draft.masterCropStart);
        if (draft.masterCropEnd !== undefined) setMasterCropEnd(draft.masterCropEnd);
        if (draft.stylePreset) setStylePreset(draft.stylePreset);
        if (draft.outroFont) setOutroFont(draft.outroFont);
      } catch (e) {
        console.error("Failed to load draft from localStorage:", e);
      }
    } else {
      historyRef.current = [JSON.parse(JSON.stringify(sections))];
      historyIndexRef.current = 0;
    }
  }, []);

  // Auto-save draft on builder changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = {
        recipientName,
        outroMessage,
        images,
        sections,
        audioUrl,
        masterCropStart,
        masterCropEnd,
        stylePreset,
        outroFont,
      };
      try {
        localStorage.setItem('tsuki-yo-draft', JSON.stringify(draft));
      } catch (e) {
        console.warn("Storage quota limit reached. Saving draft without image assets...");
        try {
          const strippedImages = images.map(img => ({ ...img, src: '' }));
          const strippedDraft = { ...draft, images: strippedImages };
          localStorage.setItem('tsuki-yo-draft', JSON.stringify(strippedDraft));
        } catch (err) {
          console.error("Failed to save draft:", err);
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [recipientName, outroMessage, images, sections, audioUrl, masterCropStart, masterCropEnd, stylePreset, outroFont]);

  // Keep track of sections restoration
  useEffect(() => {
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }
    if (historyRef.current.length > 0) {
      // Avoid initial push
      const lastState = historyRef.current[historyIndexRef.current];
      if (lastState && JSON.stringify(lastState) !== JSON.stringify(sections)) {
        pushHistory(sections);
      }
    }
  }, [sections]);

  // Enforce 180s (3-minute) crop width limit in state updates
  const updateCropStart = (val: number) => {
    const cleanStart = Math.max(0, val);
    setMasterCropStart(cleanStart);
    if (masterCropEnd - cleanStart > 180.0) {
      setMasterCropEnd(cleanStart + 180.0);
    }
  };

  const updateCropEnd = (val: number) => {
    const cleanEnd = val;
    setMasterCropEnd(cleanEnd);
    if (cleanEnd - masterCropStart > 180.0) {
      setMasterCropStart(cleanEnd - 180.0);
    }
  };

  // Reset offset when song changes
  useEffect(() => {
    setLyricOffset(0);
  }, [audioUrl]);

  // Automatically filter/slice the lyrics to fit the current crop range
  useEffect(() => {
    if (masterLyrics.length === 0) return;

    const defaultImgId = images.length > 0 ? images[0].id : '';

    const shiftedLyrics = masterLyrics.map(lyric => ({
      absoluteStart: parseFloat((lyric.absoluteStart + lyricOffset).toFixed(1)),
      text: lyric.text
    })).sort((a, b) => a.absoluteStart - b.absoluteStart);

    const filtered = shiftedLyrics.filter(
      (lyric) => lyric.absoluteStart >= masterCropStart && lyric.absoluteStart < masterCropEnd
    );

    let updated: LyricSection[] = [];
    if (filtered.length > 0) {
      updated = filtered.map((lyric, idx) => {
        const localStart = parseFloat((lyric.absoluteStart - masterCropStart).toFixed(1));
        const nextLyric = idx < filtered.length - 1 ? filtered[idx + 1] : null;
        const nextLocalStart = nextLyric ? parseFloat((nextLyric.absoluteStart - masterCropStart).toFixed(1)) : null;
        
        let localEnd = nextLocalStart !== null 
          ? Math.min(localStart + 3.0, nextLocalStart - 0.1)
          : localStart + 3.0;
        
        if (localEnd <= localStart) localEnd = localStart + 1.0;

        return {
          id: `sec-range-${idx}-${Date.now()}`,
          start: localStart,
          end: parseFloat(localEnd.toFixed(1)),
          text: lyric.text,
          imageId: defaultImgId,
          style: idx % 2 === 0 ? 'matrix_rain' : 'anime_vignette',
          scrollSpeed: 1.0,
        };
      });
    }

    if (updated.length > 0) {
      setSections(updated);
      setActiveSectionId(updated[0].id);
      pushHistory(updated);
    }
  }, [masterCropStart, masterCropEnd, masterLyrics, images, lyricOffset]);

  // Music search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sync HTML5 audio playhead and Audio Analyser setup
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = audioUrl;
    audioRef.current = audio;
    audio.playbackRate = playbackSpeed;

    // Attach Web Audio API analyser to dashboard playhead
    let actx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      actx = new AC();
      analyser = actx.createAnalyser();
      analyser.fftSize = 64;
      source = actx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(actx.destination);
      (audio as any).__dashboardAnalyser = analyser;
      (audio as any).__dashboardAudioContext = actx;
    } catch (e) {
      console.warn("Could not setup audio context for dashboard analysis:", e);
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setValidationError(null);
      
      const maxCrop = Math.min(60.0, audio.duration);
      updateCropStart(0);
      updateCropEnd(maxCrop);
    };

    const handleTimeUpdate = () => {
      const isSnippet = audio.duration <= 35;
      if (isSnippet) {
        const virtualTime = masterCropStart + audio.currentTime;
        setCurrentTime(virtualTime);
        if (virtualTime >= masterCropEnd || audio.currentTime >= audio.duration) {
          audio.currentTime = 0;
        }
      } else {
        setCurrentTime(audio.currentTime);
        if (audio.currentTime >= masterCropEnd) {
          audio.currentTime = masterCropStart;
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      if (actx) {
        actx.close().catch(() => {});
      }
    };
  }, [audioUrl, masterCropStart, masterCropEnd]);

  // Update speed whenever playbackSpeed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Sync active lyric preview (Dashboard Step 3 play preview)
  useEffect(() => {
    if (step === 3 && isPlaying) {
      const relativeTime = Math.max(0, currentTime - masterCropStart);
      let activeSec: LyricSection | null = null;
      sections.forEach((sec) => {
        if (relativeTime >= sec.start && relativeTime <= sec.end) {
          activeSec = sec;
        }
      });

      if (activeSec) {
        setActivePreviewText((activeSec as LyricSection).text);
        const img = images.find(i => i.id === (activeSec as LyricSection).imageId);
        setActivePreviewImage(img || null);
        setActivePreviewStyle((activeSec as LyricSection).style);
      } else {
        setActivePreviewText(recipientName);
        const img = images.find(i => i.id === selectedImageId);
        setActivePreviewImage(img || null);
        setActivePreviewStyle(stylePreset);
      }
    } else {
      const targetSec = sections.find(s => s.id === activeSectionId);
      if (targetSec) {
        setActivePreviewText(targetSec.text);
        const img = images.find(i => i.id === targetSec.imageId);
        setActivePreviewImage(img || null);
        setActivePreviewStyle(targetSec.style);
      } else {
        setActivePreviewText(recipientName);
        const img = images.find(i => i.id === selectedImageId);
        setActivePreviewImage(img || null);
        setActivePreviewStyle(stylePreset);
      }
    }
  }, [currentTime, isPlaying, step, sections, images, recipientName, selectedImageId, activeSectionId, stylePreset]);

  // Proximity Snap Validation checking overlaps
  useEffect(() => {
    const sorted = [...sections].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].end > sorted[i + 1].start) {
        setValidationError(`Segment collision: "${sorted[i].text}" overlaps with "${sorted[i+1].text}". Please adjust blocks.`);
        return;
      }
    }
    setValidationError(null);
  }, [sections, masterCropStart, masterCropEnd]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current as any;
    if (audio.__dashboardAudioContext && audio.__dashboardAudioContext.state === 'suspended') {
      audio.__dashboardAudioContext.resume().catch(() => {});
    }
    audio.playbackRate = playbackSpeed;

    const isSnippet = (audio.duration || 0) <= 35;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (isSnippet) {
        let localTime = currentTime - masterCropStart;
        if (localTime < 0 || localTime >= audio.duration) {
          localTime = 0;
        }
        audio.currentTime = localTime;
      } else {
        audio.currentTime = Math.max(masterCropStart, Math.min(currentTime, masterCropEnd));
      }
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomAudioName(file.name);
    const objectUrl = URL.createObjectURL(file);
    setAudioUrl(objectUrl);
    setIsPlaying(false);

    const filename = file.name.replace(/\.[^/.]+$/, "");
    let artist = '';
    let track = filename;
    if (filename.includes(' - ')) {
      const parts = filename.split(' - ');
      artist = parts[0].trim();
      track = parts[1].trim();
    } else if (filename.includes('-')) {
      const parts = filename.split('-');
      artist = parts[0].trim();
      track = parts[1].trim();
    }

    generateLyricsForTrack(artist, track).then((generated) => {
      setMasterLyrics(generated);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 5) {
      setValidationError("Maximum of 5 portraits allowed in the queue.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const srcString = event.target.result as string;
        const img = new Image();
        img.src = srcString;
        img.onload = () => {
          const eyes = detectEyesCenter(img);
          const aspect = img.width / img.height;
          let drawW = 288;
          let drawH = 288;
          if (aspect > 1) {
            drawW = 288 * aspect;
          } else {
            drawH = 288 / aspect;
          }
          const initialOffsetX = Math.round(drawW * (0.5 - eyes.x));
          const initialOffsetY = Math.round(drawH * (0.5 - eyes.y));

          const newImg: UploadedImage = {
            id: `img-${Date.now()}`,
            name: file.name.substring(0, 15),
            src: srcString,
            contrast: 1.3,
            brightness: 10,
            cropZoom: 1.0,
            cropOffsetX: initialOffsetX,
            cropOffsetY: initialOffsetY
          };
          
          const updatedImages = [...images, newImg];
          setImages(updatedImages);
          setSelectedImageId(newImg.id);
          
          setSections(prev => prev.map(s => s.imageId === '' ? { ...s, imageId: newImg.id } : s));
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const deleteImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = images.filter(i => i.id !== id);
    setImages(filtered);
    if (selectedImageId === id) {
      setSelectedImageId(filtered.length > 0 ? filtered[0].id : '');
    }
    setSections(sections.map(s => s.imageId === id ? { ...s, imageId: '' } : s));
  };

  const updateImageParam = (param: keyof UploadedImage, value: number) => {
    setImages(images.map(img => {
      if (img.id === selectedImageId) {
        return { ...img, [param]: value };
      }
      return img;
    }));
  };

  const handleMusicSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&limit=6`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results);
      }
    } catch (e) {
      console.error("Music search failed:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const parseLrc = (lrcText: string): { time: number; text: string }[] => {
    const lines = lrcText.split('\n');
    const result: { time: number; text: string }[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    const timeRegexNoMs = /\[(\d{2}):(\d{2})\]/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let time = -1;
      let text = '';

      const match = timeRegex.exec(trimmed);
      if (match) {
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        const msStr = match[3];
        const ms = parseInt(msStr) / Math.pow(10, msStr.length);
        time = min * 60 + sec + ms;
        text = trimmed.replace(timeRegex, '').trim();
      } else {
        const matchNoMs = timeRegexNoMs.exec(trimmed);
        if (matchNoMs) {
          const min = parseInt(matchNoMs[1]);
          const sec = parseInt(matchNoMs[2]);
          time = min * 60 + sec;
          text = trimmed.replace(timeRegexNoMs, '').trim();
        }
      }

      if (time >= 0 && text && !text.startsWith('[') && !text.endsWith(']')) {
        result.push({ time, text });
      }
    }
    return result.sort((a, b) => a.time - b.time);
  };

  const findBestAutoAlignmentOffset = (lyrics: { absoluteStart: number; text: string }[], trackTitle: string, audioDuration: number): number => {
    if (lyrics.length === 0 || !trackTitle || audioDuration <= 0) return 0;
    
    const firstLyricTime = lyrics[0].absoluteStart;
    const lastLyricTime = lyrics[lyrics.length - 1].absoluteStart;
    
    if (firstLyricTime > audioDuration) {
      return -firstLyricTime;
    }
    
    if (lastLyricTime > audioDuration && firstLyricTime > 5) {
      return Math.max(-firstLyricTime, -(audioDuration - 30));
    }
    
    const cleanTitle = trackTitle.toLowerCase().replace(/\(.*\)/g, '').replace(/\[.*\]/g, '').trim();
    const titleWords = cleanTitle.split(/\s+/).filter(w => w.length > 2);
    
    if (titleWords.length === 0) return 0;

    for (const lyric of lyrics) {
      const lyricText = lyric.text.toLowerCase();
      for (const word of titleWords) {
        if (lyricText.includes(word)) {
          return -lyric.absoluteStart;
        }
      }
    }
    
    return 0;
  };

  // Helper to extract subtitles by YouTube Video ID
  const fetchSubtitlesFromYoutubeById = async (videoId: string): Promise<{ absoluteStart: number; text: string }[] | null> => {
    const pipedInstances = [
      "https://api.piped.private.coffee",
      "https://pipedapi-libre.kavin.rocks",
      "https://piped-api.garudalinux.org",
      "https://api.piped.yt",
      "https://pipedapi.kavin.rocks"
    ];

    for (const instance of pipedInstances) {
      try {
        const streamUrl = `${instance}/streams/${videoId}`;
        const streamRes = await fetch(streamUrl);
        if (!streamRes.ok) continue;

        const streamData = await streamRes.json();
        if (!streamData.subtitles || streamData.subtitles.length === 0) continue;

        const subs = streamData.subtitles;
        const bestSub = 
          subs.find((s: any) => s.code === "en" && !s.autoGenerated) ||
          subs.find((s: any) => s.code === "en") ||
          subs.find((s: any) => !s.autoGenerated) ||
          subs[0];

        if (!bestSub || !bestSub.url) continue;

        const subRes = await fetch(bestSub.url);
        if (!subRes.ok) continue;

        const ttmlText = await subRes.text();
        const parsedLyrics: { absoluteStart: number; text: string }[] = [];
        const pRegex = /<p\s+begin="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
        let match;

        while ((match = pRegex.exec(ttmlText)) !== null) {
          const beginStr = match[1];
          const textHtml = match[2];

          const parts = beginStr.split(':');
          let seconds = 0;
          if (parts.length === 3) {
            seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
          } else if (parts.length === 2) {
            seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
          } else {
            seconds = parseFloat(beginStr);
          }

          let cleanText = textHtml
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/[\u266a\u266b]/g, "")
            .replace(/\s+/g, " ")
            .trim();

          if (cleanText && !cleanText.startsWith('[') && !cleanText.endsWith(']')) {
            parsedLyrics.push({
              absoluteStart: parseFloat(seconds.toFixed(1)),
              text: cleanText.toUpperCase()
            });
          }
        }

        if (parsedLyrics.length > 0) {
          return parsedLyrics;
        }
      } catch (e) {
        console.warn(`Failed to fetch subtitles for video ${videoId} from Piped instance ${instance}:`, e);
      }
    }
    return null;
  };

  // Helper to search YouTube for videos and extract candidate ID
  const fetchSubtitlesFromYoutube = async (artist: string, trackName: string): Promise<{ absoluteStart: number; text: string }[] | null> => {
    const searchQuery = `${artist} ${trackName} lyrics`;
    const pipedInstances = [
      "https://api.piped.private.coffee",
      "https://pipedapi-libre.kavin.rocks",
      "https://piped-api.garudalinux.org",
      "https://api.piped.yt",
      "https://pipedapi.kavin.rocks"
    ];

    for (const instance of pipedInstances) {
      try {
        const searchUrl = `${instance}/search?q=${encodeURIComponent(searchQuery)}&filter=videos`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) continue;

        const searchData = await searchRes.json();
        const video = searchData.items?.find((item: any) => item.type === "stream" || item.type === "video") || searchData.items?.[0];
        if (!video || !video.url) continue;

        const videoIdMatch = video.url.match(/[?&]v=([^&#]+)/) || video.url.match(/watch\/([^&#]+)/) || video.url.match(/\/watch\?v=([^&#]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : video.url.replace("/watch?v=", "");
        if (!videoId) continue;

        const lyrics = await fetchSubtitlesFromYoutubeById(videoId);
        if (lyrics && lyrics.length > 0) {
          return lyrics;
        }
      } catch (e) {
        console.warn(`Failed to search/fetch subtitles on Piped instance ${instance}:`, e);
      }
    }
    return null;
  };

  const generateLyricsForTrack = async (artist: string, trackName: string): Promise<{ absoluteStart: number; text: string }[]> => {
    const cleanArtist = artist.replace(/\s+/g, ' ').trim();
    const cleanTrack = trackName.replace(/\s+/g, ' ').replace(/\(.*\)/g, '').replace(/\[.*\]/g, '').trim();
    const trackKey = normalizeTrackKey(cleanArtist, cleanTrack);

    const cacheHit = getCachedLyrics(cleanArtist, cleanTrack);
    if (cacheHit) {
      return cacheHit.lyrics;
    }

    try {
      const lrcUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanArtist + ' ' + cleanTrack)}`;
      const lrcRes = await fetch(lrcUrl, {
        headers: { 'User-Agent': 'TsukiYoGiftBuilder/1.2 (contact@example.com)' }
      });

      if (lrcRes.ok) {
        const data = await lrcRes.json();
        if (data && data.length > 0) {
          const trackInfo = data[0];

          if (trackInfo.syncedLyrics) {
            const parsed = parseLrc(trackInfo.syncedLyrics);
            if (parsed.length > 0) {
              const lyrics = parsed.map(p => ({
                absoluteStart: parseFloat(p.time.toFixed(1)),
                text: p.text
              }));
              saveCachedLyrics({
                id: trackKey,
                artist: cleanArtist,
                trackName: cleanTrack,
                lyrics,
                cachedAt: Date.now()
              });
              return lyrics;
            }
          }

          // Synced lyrics not found on LrcLib. Try fetching synced transcripts from YouTube as a high-quality fallback.
          const ytLyrics = await fetchSubtitlesFromYoutube(cleanArtist, cleanTrack);
          if (ytLyrics && ytLyrics.length > 0) {
            saveCachedLyrics({
              id: trackKey,
              artist: cleanArtist,
              trackName: cleanTrack,
              lyrics: ytLyrics,
              cachedAt: Date.now()
            });
            return ytLyrics;
          }

          if (trackInfo.plainLyrics) {
            const lines = trackInfo.plainLyrics
              .split('\n')
              .map((l: string) => l.trim())
              .filter((l: string) => l.length > 1 && !l.startsWith('[') && !l.endsWith(']'));

            if (lines.length > 0) {
              const lyrics = lines.map((line: string, i: number) => ({
                absoluteStart: parseFloat((i * 5.0).toFixed(1)),
                text: line
              }));
              saveCachedLyrics({
                id: trackKey,
                artist: cleanArtist,
                trackName: cleanTrack,
                lyrics,
                cachedAt: Date.now()
              });
              return lyrics;
            }
          }
        }
      }
    } catch (e) {
      console.warn("LrcLib fetch failed, trying YouTube transcripts:", e);
      const ytLyrics = await fetchSubtitlesFromYoutube(cleanArtist, cleanTrack);
      if (ytLyrics && ytLyrics.length > 0) {
        saveCachedLyrics({
          id: trackKey,
          artist: cleanArtist,
          trackName: cleanTrack,
          lyrics: ytLyrics,
          cachedAt: Date.now()
        });
        return ytLyrics;
      }
    }

    try {
      const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTrack)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.lyrics) {
          const lines = data.lyrics
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 2 && !line.startsWith('[') && !line.startsWith('CHORUS') && !line.startsWith('VERSE'));
            
          if (lines.length > 0) {
            const lyrics = lines.map((line: string, i: number) => ({
              absoluteStart: parseFloat((i * 5.0).toFixed(1)),
              text: line
            }));
            saveCachedLyrics({
              id: trackKey,
              artist: cleanArtist,
              trackName: cleanTrack,
              lyrics,
              cachedAt: Date.now()
            });
            return lyrics;
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch from lyrics.ovh:", e);
    }
    
    const fallbackLyrics = [
      { absoluteStart: 1.0, text: "3" },
      { absoluteStart: 3.0, text: "2" },
      { absoluteStart: 5.0, text: "1" },
      { absoluteStart: 7.0, text: "YOU" },
      { absoluteStart: 9.0, text: "ARE" },
      { absoluteStart: 11.0, text: "MY" },
      { absoluteStart: 13.0, text: "LOVE" }
    ];

    saveCachedLyrics({
      id: trackKey,
      artist: cleanArtist,
      trackName: cleanTrack,
      lyrics: fallbackLyrics,
      cachedAt: Date.now()
    });

    return fallbackLyrics;
  };

  // Dedicated smart lyric search for local uploads or syncing
  const handleLyricsSearch = async () => {
    if (!lyricsSearchQuery.trim()) return;
    setIsSearchingLyrics(true);
    try {
      const lrclibPromise = fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(lyricsSearchQuery)}`)
        .then(res => res.ok ? res.json() : [])
        .catch(() => []);

      const ytPromise = (async () => {
        const pipedInstances = [
          "https://api.piped.private.coffee",
          "https://pipedapi-libre.kavin.rocks",
          "https://piped-api.garudalinux.org",
          "https://api.piped.yt",
          "https://pipedapi.kavin.rocks"
        ];
        for (const instance of pipedInstances) {
          try {
            const searchUrl = `${instance}/search?q=${encodeURIComponent(lyricsSearchQuery + " lyrics")}&filter=videos`;
            const searchRes = await fetch(searchUrl);
            if (!searchRes.ok) continue;
            const searchData = await searchRes.json();
            const videos = (searchData.items || []).filter((item: any) => item.type === "stream" || item.type === "video").slice(0, 3);
            return videos.map((video: any) => {
              const videoIdMatch = video.url.match(/[?&]v=([^&#]+)/) || video.url.match(/watch\/([^&#]+)/) || video.url.match(/\/watch\?v=([^&#]+)/);
              const videoId = videoIdMatch ? videoIdMatch[1] : video.url.replace("/watch?v=", "");
              return {
                isYoutube: true,
                videoId: videoId,
                name: `[YOUTUBE] ${video.title}`,
                artistName: video.uploaderName || "YouTube",
                syncedLyrics: "[YOUTUBE TRANSCRIPT AVAILABLE]" // non-empty string to show Synced badge
              };
            });
          } catch (e) {
            console.warn(`Failed YouTube search on ${instance}:`, e);
          }
        }
        return [];
      })();

      const [lrcResults, ytResults] = await Promise.all([lrclibPromise, ytPromise]);
      setLyricsSearchResults([...lrcResults, ...ytResults]);
    } catch (e) {
      console.error("Lyrics search failed:", e);
    } finally {
      setIsSearchingLyrics(false);
    }
  };

  // Sections management
  const updateSectionField = (id: string, field: keyof LyricSection, value: any) => {
    const nextSections = sections.map(s => s.id === id ? { ...s, [field]: value } : s);
    setSections(nextSections);
    
    // For immediate dropdown clicks or select modifications, commit to history index
    if (field === 'imageId' || field === 'style') {
      pushHistory(nextSections);
    }
  };

  const handleSectionTimeBlur = () => {
    const sorted = [...sections].sort((a, b) => a.start - b.start);
    setSections(sorted);
    pushHistory(sorted);
  };

  const deleteActiveSection = (id: string) => {
    const filtered = sections.filter(s => s.id !== id);
    setSections(filtered);
    if (activeSectionId === id) {
      setActiveSectionId(filtered.length > 0 ? filtered[0].id : null);
    }
    pushHistory(filtered);
  };

  const addComposerSection = () => {
    const nextStart = sections.length > 0 ? sections[sections.length - 1].end : masterCropStart;
    const nextEnd = Math.min(masterCropEnd, nextStart + 4.0);
    
    if (nextStart >= masterCropEnd) {
      setValidationError("Cannot add segment. Timeline crop window is completely occupied.");
      return;
    }

    const defaultImgId = images.length > 0 ? images[0].id : '';
    const newSec: LyricSection = {
      id: `sec-${Date.now()}`,
      start: parseFloat(nextStart.toFixed(1)),
      end: parseFloat(nextEnd.toFixed(1)),
      text: 'NEW SEGMENT',
      imageId: defaultImgId,
      style: 'matrix_rain',
      scrollSpeed: 1.0
    };
    const nextSections = [...sections, newSec].sort((a, b) => a.start - b.start);
    setSections(nextSections);
    setActiveSectionId(newSec.id);
    pushHistory(nextSections);
  };

  const activeImageObj = images.find(img => img.id === selectedImageId);
  const activeSectionObj = sections.find(s => s.id === activeSectionId);

  // Dynamic Theme Customization variables reflecting style preset
  const theme = stylePreset === 'matrix_rain'
    ? {
        accent: '#ff007f', // hot pink
        textAccent: 'text-[#ff007f]',
        bgAccent: 'bg-[#ff007f]',
        borderAccent: 'border-[#ff007f]/50',
        borderAccentFocused: 'focus:border-[#ff007f]',
        accentGlow: 'shadow-[0_0_15px_rgba(255,0,127,0.35)]',
        bgAccentMuted: 'bg-[#ff007f]/10',
        bgAccentMutedHover: 'hover:bg-[#ff007f]/20',
        textAccentMuted: 'text-[#ff007f]/70',
      }
    : {
        accent: '#d4c5a1', // gold / beige
        textAccent: 'text-[#d4c5a1]',
        bgAccent: 'bg-[#d4c5a1]',
        borderAccent: 'border-[#d4c5a1]/50',
        borderAccentFocused: 'focus:border-[#d4c5a1]',
        accentGlow: 'shadow-[0_0_15px_rgba(212,197,161,0.35)]',
        bgAccentMuted: 'bg-[#d4c5a1]/10',
        bgAccentMutedHover: 'hover:bg-[#d4c5a1]/25',
        textAccentMuted: 'text-[#d4c5a1]/70',
      };

  return (
    <div 
      className="flex-1 flex flex-col w-full min-h-0 relative overflow-x-hidden lg:overflow-hidden bg-[#131313] notranslate" 
      translate="no"
      style={{ '--accent-color': theme.accent } as React.CSSProperties}
    >
      <MatrixRain opacity={0.12} stylePreset={stylePreset} />

      {/* Wizard Progress Header */}
      <div className="w-full bg-[#1c1b1b]/80 border-b border-[#4b463c]/20 px-4 lg:px-10 py-3 lg:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10 shrink-0">
        <div className="flex items-center gap-3 lg:gap-8">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
              step >= 1 ? `${theme.bgAccent} text-black` : 'bg-gray-800 text-gray-500'
            }`}>1</span>
            <span className={`text-[10px] lg:text-xs font-mono uppercase tracking-wider transition-colors hidden sm:inline ${step === 1 ? `${theme.textAccent} font-bold` : 'text-gray-500'}`}>Canvas Setup</span>
          </div>
          <div className="w-4 lg:w-8 h-[1px] bg-gray-700"></div>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
              step >= 2 ? `${theme.bgAccent} text-black` : 'bg-gray-800 text-gray-500'
            }`}>2</span>
            <span className={`text-[10px] lg:text-xs font-mono uppercase tracking-wider transition-colors hidden sm:inline ${step === 2 ? `${theme.textAccent} font-bold` : 'text-gray-500'}`}>Core Composer</span>
          </div>
          <div className="w-4 lg:w-8 h-[1px] bg-gray-700"></div>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
              step >= 3 ? `${theme.bgAccent} text-black` : 'bg-gray-800 text-gray-500'
            }`}>3</span>
            <span className={`text-[10px] lg:text-xs font-mono uppercase tracking-wider transition-colors hidden sm:inline ${step === 3 ? `${theme.textAccent} font-bold` : 'text-gray-500'}`}>Polish & Export</span>
          </div>
        </div>

        {validationError && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-red-950/60 border border-red-800 text-red-400 text-xs font-mono">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* Main Workspace Area with Cinematic Spatial Slide transition */}
      <div key={step} className="flex-1 flex w-full overflow-x-hidden lg:overflow-hidden relative z-10 animate-page-slide">

        {/* ==============================================
            STEP 1: CANVAS SETUP
            ============================================== */}
        {step === 1 && (
          <div className="flex-1 flex flex-col lg:flex-row w-full h-full overflow-y-auto lg:overflow-hidden">
            <div className="w-full lg:w-[450px] border-b lg:border-b-0 lg:border-r border-[#4b463c]/20 p-6 lg:p-8 flex flex-col gap-6 bg-[#131313]/50 backdrop-blur-md shrink-0">
              <div>
                <h2 className="text-[#d4c5a1] text-base font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: theme.accent }}>
                  <User className="w-4 h-4" /> Recipient Details
                </h2>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Recipient Name</label>
                    <input
                      type="text"
                      maxLength={50}
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value.toUpperCase())}
                      className="w-full bg-[#1c1b1b] border border-[#4b463c]/30 rounded px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-[var(--accent-color)] text-base lg:text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Outro message</label>
                    <textarea
                      rows={3}
                      maxLength={300}
                      value={outroMessage}
                      onChange={(e) => setOutroMessage(e.target.value)}
                      className="w-full bg-[#1c1b1b] border border-[#4b463c]/30 rounded px-3 py-2 text-white text-base lg:text-xs resize-none focus:outline-none focus:border-[var(--accent-color)]"
                    />
                  </div>
                  
                  {/* Outro Font Selection Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Outro Card Font Style</label>
                    <select
                      value={outroFont}
                      onChange={(e) => setOutroFont(e.target.value)}
                      className="w-full bg-[#1c1b1b] border border-[#4b463c]/30 rounded px-3 py-2 text-base lg:text-xs text-white font-mono focus:outline-none focus:border-[var(--accent-color)]"
                    >
                      <option value="modern">Modern Sans (Clean)</option>
                      <option value="serif">Elegant Serif (Cinzel)</option>
                      <option value="script">Handwritten Script (Dancing Script)</option>
                      <option value="digital">Digital Typewriter (Share Tech)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Image Library Queue */}
              <div className="border-t border-[#4b463c]/15 pt-4">
                <h2 className="text-[#d4c5a1] text-base font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: theme.accent }}>
                  <ImageIcon className="w-4 h-4" /> Image Library Queue
                </h2>
                
                <div className="flex flex-col gap-3">
                  <div className="relative border border-dashed border-[#4b463c]/30 rounded p-4 hover:bg-[#1c1b1b]/50 transition-colors group cursor-pointer flex flex-col items-center justify-center gap-1 bg-[#131313]/20">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-[var(--accent-color)] transition-colors" />
                    <span className="text-[11px] font-mono text-gray-400">Add Portrait to Queue</span>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => setSelectedImageId(img.id)}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-all ${
                          selectedImageId === img.id
                            ? 'bg-[#d4c5a1]/10 border-[var(--accent-color)]'
                            : 'border-[#4b463c]/20 hover:bg-[#1c1b1b]/30'
                        }`}
                      >
                        <div className="w-10 h-10 rounded overflow-hidden bg-[#1c1b1b] shrink-0 border border-[#4b463c]/20">
                          <img src={img.src} alt={img.name} className="w-full h-full object-cover grayscale" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate font-mono">{img.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">Zoom: {img.cropZoom.toFixed(1)}x</p>
                        </div>
                        <button
                          onClick={(e) => deleteImage(img.id, e)}
                          className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Crop alignment viewport */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8 bg-[#0e0e0e]/40 min-h-[380px] lg:min-h-0">
              {activeImageObj ? (
                <div className="flex flex-col items-center gap-6 max-w-lg w-full">
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-widest text-center">
                    Image Alignment Crop Guide
                  </span>
                  
                  <div className="w-full max-w-[384px] aspect-video border border-[#d4c5a1]/30 overflow-hidden relative shadow-2xl bg-black rounded-lg" style={{ borderColor: theme.accent }}>
                    <div className="absolute inset-0 border border-[#d4c5a1]/40 pointer-events-none z-10 rounded-lg" style={{ borderColor: theme.accent }}></div>
                    <div className="absolute inset-0 bg-[#0e0e0e]/20 z-0"></div>
                    
                    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                      <img
                        src={activeImageObj.src}
                        alt="Crop target"
                        className="max-w-none grayscale object-contain animate-fade-in w-full h-full"
                        style={{
                          transform: `translate(${activeImageObj.cropOffsetX}px, ${activeImageObj.cropOffsetY}px) scale(${activeImageObj.cropZoom})`,
                          filter: `contrast(${activeImageObj.contrast}) brightness(${activeImageObj.brightness + 100}%)`,
                          transition: 'transform 0.1s ease-out'
                        }}
                      />
                    </div>
                  </div>

                  {/* sliders */}
                  <div className="w-full bg-[#1c1b1b]/85 border border-[#4b463c]/30 rounded-lg p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-gray-400">Crop Zoom</span>
                      <span className="text-[#d4c5a1]" style={{ color: theme.accent }}>{activeImageObj.cropZoom.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.05"
                      value={activeImageObj.cropZoom}
                      onChange={(e) => updateImageParam('cropZoom', parseFloat(e.target.value))}
                      className="w-full accent-[var(--accent-color)]"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-gray-500 font-mono">OFFSET X</span>
                        <input
                          type="range"
                          min="-500"
                          max="500"
                          step="5"
                          value={activeImageObj.cropOffsetX}
                          onChange={(e) => updateImageParam('cropOffsetX', parseInt(e.target.value))}
                          className="w-full accent-[var(--accent-color)]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-gray-500 font-mono">OFFSET Y</span>
                        <input
                          type="range"
                          min="-500"
                          max="500"
                          step="5"
                          value={activeImageObj.cropOffsetY}
                          onChange={(e) => updateImageParam('cropOffsetY', parseInt(e.target.value))}
                          className="w-full accent-[var(--accent-color)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-[#4b463c]/15 pt-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 font-mono">CONTRAST: {activeImageObj.contrast}x</span>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={activeImageObj.contrast}
                          onChange={(e) => updateImageParam('contrast', parseFloat(e.target.value))}
                          className="w-full accent-[var(--accent-color)]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 font-mono">BRIGHTNESS: {activeImageObj.brightness}</span>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          step="5"
                          value={activeImageObj.brightness}
                          onChange={(e) => updateImageParam('brightness', parseInt(e.target.value))}
                          className="w-full accent-[var(--accent-color)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-[#4b463c]/20 rounded-xl bg-[#1c1b1b]/10 text-gray-500 font-mono text-xs text-center max-w-md">
                  <ImageIcon className="w-8 h-8 mb-2 text-gray-600 animate-pulse" />
                  <span>No portraits uploaded yet.</span>
                  <span className="text-[10px] text-gray-600 mt-1">Upload portrait files in the Left Queue to customize your face mask overlays.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==============================================
            STEP 2: CORE COMPOSER (TIMELINE & MUSIC SEARCH)
            ============================================== */}
        {step === 2 && (
          <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-y-auto lg:overflow-hidden h-full gap-4">
            
            {/* Top row: Visual Timeline */}
            <div className="w-full bg-[#1c1b1b]/80 border border-[#4b463c]/20 p-5 rounded-xl backdrop-blur-md shrink-0 flex flex-col gap-4">
              
              {/* Online Music Search Bar */}
              <div className="border-b border-[#4b463c]/15 pb-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Search online tracks & preview audio (e.g. Hans Zimmer, Interstellar)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleMusicSearch(); }}
                    className="flex-1 bg-black border border-[#4b463c]/30 rounded-lg px-4 py-2 text-base lg:text-xs text-white font-mono focus:outline-none focus:border-[var(--accent-color)] transition-all"
                  />
                  <button
                    onClick={handleMusicSearch}
                    disabled={isSearching}
                    className="text-black hover:opacity-90 px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase disabled:opacity-40"
                    style={{ backgroundColor: theme.accent }}
                  >
                    {isSearching ? 'Searching...' : 'Search Audio'}
                  </button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-black/50 rounded-lg border border-[#4b463c]/15 max-h-[140px] overflow-y-auto">
                    {searchResults.map((track: any) => (
                      <div
                        key={track.trackId}
                        onClick={async () => {
                          const cachedSong = getCachedSong(track.artistName, track.trackName);
                          const songUrl = cachedSong?.audioUrl || track.previewUrl;
                          setAudioUrl(songUrl);
                          setCustomAudioName(`${track.trackName} - ${track.artistName}`);
                          setIsPlaying(false);
                          setSearchResults([]);

                          saveCachedSong({
                            id: normalizeTrackKey(track.artistName, track.trackName),
                            artist: track.artistName,
                            trackName: track.trackName,
                            audioUrl: songUrl,
                            artworkUrl60: track.artworkUrl60,
                            source: 'search',
                            cachedAt: Date.now()
                          });
                          
                          const cachedLyrics = getCachedLyrics(track.artistName, track.trackName);
                          if (cachedLyrics) {
                            setMasterLyrics(cachedLyrics.lyrics);
                            if (cachedLyrics.lyrics.length > 0) {
                              const autoOffset = findBestAutoAlignmentOffset(cachedLyrics.lyrics, track.trackName, 180);
                              setLyricOffset(autoOffset);
                              const firstLyricTime = Math.max(0, cachedLyrics.lyrics[0].absoluteStart + autoOffset);
                              const cropStart = Math.max(0, firstLyricTime - 2);
                              updateCropStart(cropStart);
                              updateCropEnd(cropStart + Math.min(60.0, duration || 60.0));
                            } else {
                              setLyricOffset(0);
                            }
                            return;
                          }

                          const generated = await generateLyricsForTrack(track.artistName, track.trackName);
                          setMasterLyrics(generated);
                          if (generated.length > 0) {
                            const autoOffset = findBestAutoAlignmentOffset(generated, track.trackName, 180);
                            setLyricOffset(autoOffset);
                            const firstLyricTime = Math.max(0, generated[0].absoluteStart + autoOffset);
                            const cropStart = Math.max(0, firstLyricTime - 2);
                            updateCropStart(cropStart);
                            updateCropEnd(cropStart + Math.min(60.0, duration || 60.0));
                          } else {
                            setLyricOffset(0);
                          }
                        }}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer border hover:bg-[#d4c5a1]/10 hover:border-[var(--accent-color)] transition-all ${
                          audioUrl === track.previewUrl
                            ? 'bg-[#d4c5a1]/10 border-[var(--accent-color)]'
                            : 'bg-black/40 border-[#4b463c]/15'
                        }`}
                      >
                        <img
                          src={track.artworkUrl60}
                          alt=""
                          className="w-8 h-8 rounded object-cover border border-[#4b463c]/30 shrink-0"
                        />
                        <div className="flex-1 min-w-0 text-[10px] font-mono leading-normal">
                          <p className="text-white truncate font-bold">{track.trackName}</p>
                          <p className="text-gray-400 truncate">{track.artistName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Lyric-only search bar for uploaded tracks */}
              <div className="border-b border-[#4b463c]/15 pb-4 flex flex-col gap-3">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Search & Import Synced Lyrics (.lrc)</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Search song lyrics (e.g. Bruno Mars - Die With A Smile)..."
                    value={lyricsSearchQuery}
                    onChange={(e) => setLyricsSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLyricsSearch(); }}
                    className="flex-1 bg-black border border-[#4b463c]/30 rounded-lg px-4 py-2 text-base lg:text-xs text-white font-mono focus:outline-none focus:border-[var(--accent-color)] transition-all"
                  />
                  <button
                    onClick={handleLyricsSearch}
                    disabled={isSearchingLyrics}
                    className="text-black hover:opacity-90 px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase disabled:opacity-40 font-semibold"
                    style={{ backgroundColor: theme.accent }}
                  >
                    {isSearchingLyrics ? 'Searching...' : 'Search Lyrics'}
                  </button>
                </div>
                
                {lyricsSearchResults.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 bg-black/50 rounded-lg border border-[#4b463c]/15 max-h-[150px] overflow-y-auto">
                    {lyricsSearchResults.slice(0, 5).map((track: any, idx) => (
                      <div
                        key={idx}
                        onClick={async () => {
                          let lyrics: { absoluteStart: number; text: string }[] = [];
                          if (track.isYoutube) {
                            setIsSearchingLyrics(true);
                            try {
                              const ytLyrics = await fetchSubtitlesFromYoutubeById(track.videoId);
                              if (ytLyrics && ytLyrics.length > 0) {
                                lyrics = ytLyrics;
                              } else {
                                alert("No YouTube transcript or subtitles found for this video. Try another track.");
                              }
                            } catch (e) {
                              console.error("Failed to load YouTube subtitles:", e);
                            } finally {
                              setIsSearchingLyrics(false);
                            }
                          } else if (track.syncedLyrics && track.syncedLyrics !== "[YOUTUBE TRANSCRIPT AVAILABLE]") {
                            const parsed = parseLrc(track.syncedLyrics);
                            lyrics = parsed.map(p => ({
                              absoluteStart: parseFloat(p.time.toFixed(1)),
                              text: p.text
                            }));
                          } else if (track.plainLyrics) {
                            const lines = track.plainLyrics
                              .split('\n')
                              .map((l: string) => l.trim())
                              .filter((l: string) => l.length > 1);
                            lyrics = lines.map((line: string, i: number) => ({
                              absoluteStart: parseFloat((i * 5.0).toFixed(1)),
                              text: line
                            }));
                          }
                          
                          if (lyrics.length > 0) {
                            setMasterLyrics(lyrics);
                            const autoOffset = findBestAutoAlignmentOffset(lyrics, track.name || '', 180);
                            setLyricOffset(autoOffset);
                            setLyricsSearchResults([]);
                            setLyricsSearchQuery('');
                            
                            const firstLyricTime = Math.max(0, lyrics[0].absoluteStart + autoOffset);
                            const cropStart = Math.max(0, firstLyricTime - 2);
                            updateCropStart(cropStart);
                            updateCropEnd(cropStart + Math.min(60.0, duration || 60.0));
                          }
                        }}
                        className="flex items-center justify-between p-2 rounded cursor-pointer border border-[#4b463c]/15 bg-black/20 hover:bg-[#d4c5a1]/5 hover:border-[var(--accent-color)] transition-all text-xs font-mono"
                      >
                        <div className="flex flex-col leading-normal">
                          <span className="text-white font-bold">{track.name}</span>
                          <span className="text-gray-400 text-[10px]">{track.artistName}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 uppercase">
                          {track.syncedLyrics ? 'Synced LRC' : 'Plain Text'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lyrics Sync Alignment */}
              {masterLyrics.length > 0 && (
                <div className="flex flex-col gap-2 p-3 bg-black/40 border border-[#4b463c]/20 rounded-lg">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                    <span>Lyrics Sync Alignment (Align Chorus/Verse start)</span>
                    {lyricOffset !== 0 && (
                      <span className="text-[#ff007f] font-bold" style={{ color: theme.accent }}>Shifted: {lyricOffset.toFixed(1)}s</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      onChange={(e) => {
                        const targetTime = parseFloat(e.target.value);
                        if (targetTime >= 0) {
                          setLyricOffset(masterCropStart - targetTime);
                        } else {
                          setLyricOffset(0);
                        }
                      }}
                      className="flex-1 bg-black border border-[#4b463c]/30 rounded px-2 py-1.5 text-base lg:text-xs text-white font-mono focus:outline-none focus:border-[var(--accent-color)]"
                    >
                      <option value="-1">-- Select the first lyric line you hear to auto-align --</option>
                      {masterLyrics.map((lyric, idx) => (
                        <option key={idx} value={lyric.absoluteStart}>
                          [{Math.floor(lyric.absoluteStart / 60)}:{(Math.floor(lyric.absoluteStart % 60)).toString().padStart(2, '0')}] {lyric.text}
                        </option>
                      ))}
                    </select>
                    {lyricOffset !== 0 && (
                      <button
                        onClick={() => setLyricOffset(0)}
                        className="bg-[#4b463c]/35 hover:bg-[#4b463c]/60 text-white px-3 py-1.5 rounded text-xs font-mono font-bold transition-all"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h2 className="text-[#d4c5a1] text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: theme.accent }}>
                  <Music className="w-4 h-4 animate-pulse" /> Timeline Bounding Blocks
                </h2>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative border border-dashed border-[#4b463c]/30 rounded px-3 py-1.5 hover:bg-black/30 transition-colors group cursor-pointer flex items-center gap-2 text-xs">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-3.5 h-3.5 text-gray-400 group-hover:text-[var(--accent-color)] transition-colors" />
                    <span className="text-gray-300 font-mono truncate max-w-[150px]">
                      {customAudioName || "Upload Local Track..."}
                    </span>
                  </div>

                  {!customAudioName && (
                    <select
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      className="bg-black border border-[#4b463c]/30 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                    >
                      {DEFAULT_AUDIO_OPTIONS.map((opt, idx) => (
                        <option key={idx} value={opt.url}>{opt.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Timeline widget */}
              <WaveformTimeline
                audioUrl={audioUrl}
                masterCropStart={masterCropStart}
                masterCropEnd={masterCropEnd}
                duration={duration || (masterCropEnd - masterCropStart) || 30}
                currentTime={currentTime}
                sections={sections}
                images={images}
                activeSectionId={activeSectionId}
                onSelectSection={setActiveSectionId}
                onUpdateSections={setSections}
                onChangeCropStart={updateCropStart}
                onChangeCropEnd={updateCropEnd}
                onDragEnd={() => {
                  if (audioRef.current) {
                    const isSnippet = audioRef.current.duration <= 35;
                    audioRef.current.currentTime = isSnippet ? 0 : masterCropStart;
                    setCurrentTime(masterCropStart);
                  }
                  pushHistory(sections);
                }}
                analyser={audioRef.current ? (audioRef.current as any).__dashboardAnalyser : null}
                stylePreset={stylePreset}
                audioElement={audioRef.current}
                masterLyrics={masterLyrics}
              />

              {/* Play head control line with Undo/Redo & Playback Speed Controls */}
              <div className="flex flex-wrap items-center gap-3 lg:gap-4 bg-black/40 p-3 lg:p-2.5 rounded border border-[#4b463c]/15 text-xs font-mono">
                <button
                  onClick={togglePlay}
                  className="text-black rounded px-3 py-1 flex items-center gap-1 transition-all text-xs font-bold"
                  style={{ backgroundColor: theme.accent }}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>

                {/* 0.5x Speed Sync control */}
                <button
                  onClick={() => setPlaybackSpeed(s => s === 1.0 ? 0.5 : 1.0)}
                  className={`rounded px-3 py-1 text-xs font-bold transition-all border ${
                    playbackSpeed === 0.5 
                      ? `text-black border-transparent`
                      : 'border-[#4b463c]/40 text-gray-400 hover:text-white'
                  }`}
                  style={{ backgroundColor: playbackSpeed === 0.5 ? theme.accent : 'transparent' }}
                >
                  0.5x Speed
                </button>

                {/* Visual Undo/Redo Buttons */}
                <div className="flex items-center gap-1.5 border-l border-[#4b463c]/20 pl-4">
                  <button
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className="p-1 rounded hover:bg-black/40 disabled:opacity-30 disabled:hover:bg-transparent text-gray-400 hover:text-white transition-all flex items-center gap-1"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Undo</span>
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className="p-1 rounded hover:bg-black/40 disabled:opacity-30 disabled:hover:bg-transparent text-gray-400 hover:text-white transition-all flex items-center gap-1"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Redo</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500 uppercase text-[10px]">Crop Window:</span>
                  <input
                    type="number"
                    min="0"
                    max={duration || 180}
                    step="0.5"
                    value={masterCropStart}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(duration || 180, parseFloat(e.target.value) || 0));
                      updateCropStart(val);
                      if (audioRef.current) audioRef.current.currentTime = val;
                    }}
                    className="w-16 bg-black border border-[#4b463c]/20 rounded text-center text-white text-base lg:text-xs py-0.5"
                  />
                  <span className="text-gray-600">-</span>
                  <input
                    type="number"
                    min={masterCropStart + 1}
                    max={duration || 180}
                    step="0.5"
                    value={masterCropEnd}
                    onChange={(e) => {
                      const val = Math.max(masterCropStart + 1, Math.min(duration || 180, parseFloat(e.target.value) || duration || 180));
                      updateCropEnd(val);
                    }}
                    className="w-16 bg-black border border-[#4b463c]/20 rounded text-center text-white text-base lg:text-xs py-0.5"
                  />
                </div>

                <div className="ml-auto text-gray-400">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Contextual Fields for Selected Timeline Block */}
              {activeSectionObj ? (
                <div className="bg-[#131313]/90 border rounded-lg p-4 mt-2 flex flex-col gap-3 transition-all animate-fade-in shadow-[0_0_15px_rgba(0,0,0,0.4)]" style={{ borderColor: theme.accent }}>
                  <div className="flex justify-between items-center border-b border-[#4b463c]/20 pb-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
                      Selected Segment Details ({activeSectionObj.start.toFixed(1)}s - {activeSectionObj.end.toFixed(1)}s)
                    </span>
                    <button
                      onClick={() => deleteActiveSection(activeSectionObj.id)}
                      className="text-gray-500 hover:text-red-400 font-mono text-[10px] uppercase flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Segment
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 uppercase font-semibold font-mono">Lyric Text String</label>
                      <input
                        type="text"
                        value={activeSectionObj.text}
                        onChange={(e) => updateSectionField(activeSectionObj.id, 'text', e.target.value.toUpperCase())}
                        onBlur={() => pushHistory(sections)}
                        onKeyDown={(e) => { if (e.key === 'Enter') pushHistory(sections); }}
                        placeholder="ENTER LYRIC STRING..."
                        className="w-full bg-black border border-[#4b463c]/30 rounded px-3 py-1.5 text-base lg:text-xs text-white font-mono uppercase focus:outline-none focus:border-[var(--accent-color)]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 uppercase font-semibold font-mono">Assigned Portrait Mask</label>
                      <select
                        value={activeSectionObj.imageId}
                        onChange={(e) => updateSectionField(activeSectionObj.id, 'imageId', e.target.value)}
                        className="w-full bg-black border border-[#4b463c]/30 rounded px-3 py-1.5 text-base lg:text-xs text-white font-mono focus:outline-none focus:border-[var(--accent-color)]"
                      >
                        <option value="">No Portrait (Default Green/Gold Stitches)</option>
                        {images.map(img => (
                          <option key={img.id} value={img.id}>{img.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-gray-400 uppercase font-semibold font-mono">Start Time (sec)</label>
                        <span className="text-[9px] text-gray-500 font-mono">Relative to Crop</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={(activeSectionObj.end - 0.1).toFixed(1)}
                        step="0.1"
                        value={parseFloat(activeSectionObj.start.toFixed(1))}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(activeSectionObj.end - 0.1, parseFloat(e.target.value) || 0));
                          updateSectionField(activeSectionObj.id, 'start', parseFloat(val.toFixed(1)));
                        }}
                        onBlur={handleSectionTimeBlur}
                        className="w-full bg-black border border-[#4b463c]/30 rounded px-3 py-1.5 text-base lg:text-xs text-white font-mono focus:outline-none focus:border-[var(--accent-color)]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-gray-400 uppercase font-semibold font-mono">End Time (sec)</label>
                        <span className="text-[9px] text-gray-500 font-mono">Max: 60s</span>
                      </div>
                      <input
                        type="number"
                        min={(activeSectionObj.start + 0.1).toFixed(1)}
                        max={(masterCropEnd - masterCropStart).toFixed(1)}
                        step="0.1"
                        value={parseFloat(activeSectionObj.end.toFixed(1))}
                        onChange={(e) => {
                          const val = Math.max(activeSectionObj.start + 0.1, Math.min(masterCropEnd - masterCropStart, parseFloat(e.target.value) || 0));
                          updateSectionField(activeSectionObj.id, 'end', parseFloat(val.toFixed(1)));
                        }}
                        onBlur={handleSectionTimeBlur}
                        className="w-full bg-black border border-[#4b463c]/30 rounded px-3 py-1.5 text-base lg:text-xs text-white font-mono focus:outline-none focus:border-[var(--accent-color)]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#131313]/30 border border-dashed border-[#4b463c]/20 rounded-lg p-4 mt-2 text-center text-xs font-mono text-gray-500 uppercase">
                  Select a bounding block on the timeline above to edit its text details and image mask mapping.
                </div>
              )}
            </div>

            {/* Split composer list bottom panel */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-[400px] lg:min-h-0 lg:overflow-hidden">
              
              {/* Left Column: Chapters scroll list */}
              <div className="flex-1 bg-[#1c1b1b]/60 border border-[#4b463c]/20 rounded-xl p-4 lg:p-5 flex flex-col min-h-[300px] lg:min-h-0">
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <h3 className="text-white text-xs font-bold font-mono uppercase tracking-wider">Chapters Sequence</h3>
                  <button
                    onClick={addComposerSection}
                    className="border text-[10px] font-mono uppercase px-2.5 py-1 rounded flex items-center gap-1 transition-all"
                    style={{ backgroundColor: theme.bgAccentMuted, color: theme.accent, borderColor: theme.accent }}
                  >
                    <Plus className="w-3 h-3" /> Add Lyric
                  </button>
                </div>

                {/* Chapters list rows */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                  {sections.map((sec) => (
                    <div
                      key={sec.id}
                      onClick={() => setActiveSectionId(sec.id)}
                      className={`p-3 rounded border flex items-center gap-3 transition-all cursor-pointer ${
                        activeSectionId === sec.id
                          ? 'bg-[#d4c5a1]/5 border-[var(--accent-color)]'
                          : 'bg-black/30 border-[#4b463c]/15 hover:border-[#4b463c]/35'
                      }`}
                    >
                      <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap">
                        {sec.start.toFixed(1)}s - {sec.end.toFixed(1)}s
                      </span>

                      <input
                        type="text"
                        value={sec.text}
                        onChange={(e) => updateSectionField(sec.id, 'text', e.target.value.toUpperCase())}
                        onBlur={() => pushHistory(sections)}
                        onKeyDown={(e) => { if (e.key === 'Enter') pushHistory(sections); }}
                        onClick={(e) => e.stopPropagation()} 
                        placeholder="Lyric text..."
                        className="flex-1 bg-black border border-[#4b463c]/20 rounded px-2 py-1 text-xs text-white font-mono uppercase focus:outline-none focus:border-[var(--accent-color)]"
                      />

                      <select
                        value={sec.imageId}
                        onChange={(e) => updateSectionField(sec.id, 'imageId', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-black border border-[#4b463c]/20 rounded px-1.5 py-1 text-[10px] text-gray-300 focus:outline-none"
                      >
                        <option value="">No Image</option>
                        {images.map(img => (
                          <option key={img.id} value={img.id}>{img.name}</option>
                        ))}
                      </select>

                      <select
                        value={sec.style}
                        onChange={(e) => updateSectionField(sec.id, 'style', e.target.value as any)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-black border border-[#4b463c]/20 rounded px-1.5 py-1 text-[10px] text-gray-300 focus:outline-none"
                      >
                        <option value="matrix_rain">Matrix Rain</option>
                        <option value="anime_vignette">Anime Vignette</option>
                      </select>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteActiveSection(sec.id);
                        }}
                        className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {sections.length === 0 && (
                    <div className="text-center py-8 text-xs font-mono text-gray-600">
                      No chapters defined. Click "Add Lyric" to get started.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Advanced tuning for focused segment */}
              <div className="w-full lg:w-[320px] bg-[#1c1b1b]/60 border border-[#4b463c]/20 rounded-xl p-4 lg:p-5 flex flex-col shrink-0 min-h-[220px] lg:min-h-0 justify-center">
                {activeSectionObj ? (
                  <div className="flex flex-col gap-4 h-full justify-between">
                    <div>
                      <h4 className="text-white text-xs font-bold font-mono uppercase tracking-wider border-b border-[#4b463c]/15 pb-2 mb-4">
                        Chapter Fine Tuning
                      </h4>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                          <span>Lyric Speed</span>
                          <span className="text-[#d4c5a1]" style={{ color: theme.accent }}>{(activeSectionObj.scrollSpeed ?? 1.0).toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3.0"
                          step="0.1"
                          value={activeSectionObj.scrollSpeed ?? 1.0}
                          onChange={(e) => updateSectionField(activeSectionObj.id, 'scrollSpeed', parseFloat(e.target.value))}
                          className="w-full accent-[var(--accent-color)]"
                        />
                      </div>
                    </div>

                    {/* Image preview */}
                    <div className="flex-1 flex flex-col items-center justify-center bg-black/35 rounded border border-[#4b463c]/15 p-4 gap-2 my-4">
                      {images.find(img => img.id === activeSectionObj.imageId) ? (
                        <>
                          <div className="w-20 h-20 rounded-full overflow-hidden bg-black border border-[#4b463c]/25">
                            <img
                              src={images.find(img => img.id === activeSectionObj.imageId)?.src}
                              alt=""
                              className="w-full h-full object-cover grayscale"
                            />
                          </div>
                          <span className="text-[10px] font-mono text-[#cdc6b9] mt-1 text-center truncate max-w-[180px]">
                            {images.find(img => img.id === activeSectionObj.imageId)?.name}
                          </span>
                        </>
                      ) : (
                        <div className="text-center text-gray-500 font-mono text-[9px] uppercase">
                          <Sparkles className="w-6 h-6 mx-auto mb-1 animate-pulse" style={{ color: theme.accent }} />
                          <span>Style Preset</span>
                          <span className="text-[11px] text-white font-bold block mt-1">
                            {activeSectionObj.style === 'matrix_rain' ? 'Matrix Rain' : 'Anime Vignette'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-600 font-mono text-[10px] uppercase p-4">
                    Select a chapter from the list to tune speed options.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ==============================================
            STEP 3: POLISH & EXPORT (PLAYER PREVIEW)
            ============================================== */}
        {step === 3 && (
          <div className="flex-1 flex flex-col lg:flex-row w-full h-full overflow-y-auto lg:overflow-hidden">
            {/* Styles Panel */}
            <div className="w-full lg:w-[380px] border-b lg:border-b-0 lg:border-r border-[#4b463c]/20 p-6 lg:p-8 flex flex-col gap-6 bg-black/30 backdrop-blur-md shrink-0">
              <div className="flex flex-col gap-6">
                <div className="border-b border-[#4b463c]/15 pb-2">
                  <h2 className="text-[#d4c5a1] text-base font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: theme.accent }}>
                    <Sparkles className="w-4 h-4" /> Style Engine Settings
                  </h2>
                  <p className="text-[10px] text-gray-400 font-mono uppercase mt-1">Choose environmental defaults</p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] text-gray-500 font-mono uppercase">Global Theme Preset</label>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setStylePreset('matrix_rain')}
                      className={`w-full text-left px-4 py-3 rounded border text-xs font-mono transition-all flex items-center justify-between ${
                        stylePreset === 'matrix_rain'
                          ? 'bg-[#d4c5a1]/10 border-[var(--accent-color)] text-white font-bold'
                          : 'border-[#4b463c]/20 text-gray-400 hover:text-white bg-[#1c1b1b]/30'
                      }`}
                      style={{ borderColor: stylePreset === 'matrix_rain' ? theme.accent : undefined }}
                    >
                      <span>1. Matrix Code Rain</span>
                      <span className="text-[9px] text-[#cdc6b9]">Green & Gold stitches</span>
                    </button>
                    <button
                      onClick={() => setStylePreset('anime_vignette')}
                      className={`w-full text-left px-4 py-3 rounded border text-xs font-mono transition-all flex items-center justify-between ${
                        stylePreset === 'anime_vignette'
                          ? 'bg-[#d4c5a1]/10 border-[var(--accent-color)] text-white font-bold'
                          : 'border-[#4b463c]/20 text-gray-400 hover:text-white bg-[#1c1b1b]/30'
                      }`}
                      style={{ borderColor: stylePreset === 'anime_vignette' ? theme.accent : undefined }}
                    >
                      <span>2. Anime Vignette Preset</span>
                      <span className="text-[9px] text-[#cdc6b9]">Warm white serif stitches</span>
                    </button>
                  </div>
                </div>

                {/* Share Gift Link Section */}
                <div className="border-t border-[#4b463c]/15 pt-4 flex flex-col gap-3">
                  <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Share Gift Experience</span>
                  <button
                    onClick={async () => {
                      try {
                        const b64 = await serializeGift({
                          recipientName,
                          outroMessage,
                          outroFont,
                          images,
                          lyrics: sections,
                          audioUrl,
                          masterCropStart,
                          masterCropEnd,
                          stylePreset
                        });
                        const url = `${window.location.origin}${window.location.pathname}?gift=${b64}`;
                        setShareUrl(url);
                        navigator.clipboard.writeText(url)
                          .then(() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 3000);
                          })
                          .catch(() => {
                            alert("Could not copy link automatically. Please copy the URL from the text box below.");
                          });
                      } catch (e) {
                        console.error("Failed to serialize and copy gift URL:", e);
                      }
                    }}
                    className="w-full bg-[#1c1b1b]/50 border border-[#4b463c]/40 hover:bg-[#ff007f]/10 text-white font-mono text-xs uppercase py-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    style={{ borderColor: copied ? theme.accent : undefined }}
                  >
                    <Sparkles className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                    <span>{copied ? 'Link Copied!' : 'Copy Share Link'}</span>
                  </button>

                  {shareUrl && (
                    <div className="flex flex-col gap-1.5 animate-fade-in mt-1">
                      <span className="text-[9px] text-gray-500 font-mono uppercase">Direct URL Link</span>
                      <input
                        type="text"
                        readOnly
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        value={shareUrl}
                        className="w-full bg-black/60 border border-[#4b463c]/30 rounded px-2.5 py-1.5 text-[9px] text-gray-400 font-mono focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Audio controller */}
              <div className="mt-auto border-t border-[#4b463c]/15 pt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={togglePlay}
                    className="text-black rounded px-4 py-2 flex items-center gap-1.5 transition-all text-xs font-bold"
                    style={{ backgroundColor: theme.accent }}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'PAUSE' : 'PLAY PREVIEW'}</span>
                  </button>
                  <span className="font-mono text-xs text-gray-400">
                    {formatTime(currentTime)}
                  </span>
                </div>
              </div>
            </div>

            {/* Canvas Preview Frame */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8 bg-[#0e0e0e]/40 min-h-[280px] lg:min-h-0">
              <div className="w-full max-w-2xl aspect-video rounded-xl border border-[#4b463c]/30 overflow-hidden relative bg-[#131313] flex items-center justify-center shadow-2xl">
                <div className="absolute inset-0 bg-black/60 z-0"></div>
                
                <div className="w-full h-full relative z-10 flex items-center justify-center animate-fade-in">
                  <StitchEngine
                    text={activePreviewText}
                    imageSrc={activePreviewImage ? activePreviewImage.src : null}
                    contrast={activePreviewImage ? activePreviewImage.contrast : 1.3}
                    brightness={activePreviewImage ? activePreviewImage.brightness : 10}
                    cropZoom={activePreviewImage ? activePreviewImage.cropZoom : 1.0}
                    cropOffsetX={activePreviewImage ? activePreviewImage.cropOffsetX : 0}
                    cropOffsetY={activePreviewImage ? activePreviewImage.cropOffsetY : 0}
                    stylePreset={activePreviewStyle}
                    currentTime={currentTime - masterCropStart}
                    sectionStart={activeSectionObj ? activeSectionObj.start : 0}
                    sectionEnd={activeSectionObj ? activeSectionObj.end : (masterCropEnd - masterCropStart)}
                    audioElement={audioRef.current}
                    isPlaying={isPlaying}
                  />
                </div>
 
                {/* Display active parameters */}
                <div className="absolute bottom-4 left-4 z-20 text-[10px] font-mono text-gray-500 uppercase tracking-widest bg-black/60 px-2 py-0.5 rounded border border-[#4b463c]/20">
                  Style: {activePreviewStyle.replace('_', ' ')}
                </div>
              </div>

              <div className="mt-4 max-w-md text-center text-xs text-gray-500 font-mono">
                MORPH PREVIEW PLAYBACK IS SYNCED TO CURRENT TIMELINE TARGETS AND PORTRAIT SETTINGS.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div className="w-full bg-[#1c1b1b]/80 border-t border-[#4b463c]/20 px-4 lg:px-10 py-4 lg:py-5 flex items-center justify-between z-10 shrink-0">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1) as any)}
          disabled={step === 1}
          className="border border-[#4b463c]/40 text-gray-400 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 font-semibold uppercase tracking-wider px-5 py-2.5 rounded text-xs flex items-center gap-1 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep(s => Math.min(3, s + 1) as any)}
            disabled={!!validationError}
            className="text-black disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-semibold uppercase tracking-wider px-6 py-2.5 rounded text-xs flex items-center gap-1 transition-all"
            style={{ backgroundColor: !!validationError ? undefined : theme.accent }}
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => {
              if (validationError) return;
              onPreview({
                recipientName,
                outroMessage,
                outroFont,
                images,
                lyrics: sections,
                audioUrl,
                masterCropStart,
                masterCropEnd,
                stylePreset
              });
            }}
            disabled={!!validationError}
            className="text-black disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-semibold uppercase tracking-wider px-8 py-3 rounded text-xs flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: !!validationError ? undefined : theme.accent }}
          >
            <span>Preview & Share Gift</span>
            <Sparkles className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
