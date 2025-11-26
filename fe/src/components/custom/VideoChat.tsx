"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ArrowLeft,
  Send,
  Globe,
  X,
  RotateCcw,
  Power,
  Users,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { useGetUser } from "@/hooks/use-getuser";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useSignaling, onAuthOk } from "@/hooks/SocketProvider";
import { useWebRTC } from "@/hooks/useWebRTC";

interface VideoChatPageProps {
  gender: string;
}

export default function VideoChatPage({ gender }: VideoChatPageProps) {
  // UI state
  const [currentTime, setCurrentTime] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStreamReady, setLocalStreamReady] = useState(false);
  const [remoteStreamReady, setRemoteStreamReady] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  // refs
  const selfVideoRef = useRef<HTMLVideoElement | null>(null);
  const strangerVideoRef = useRef<HTMLVideoElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const hasStartedRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);

  // auth / router
  const user = useGetUser();
  const userId = user?.id ?? null;
  const username = user?.username ?? user?.name ?? undefined;
  const { status: sessionStatus, data: session } = useSession();
  const router = useRouter();

  console.log("[VideoChatPage] User data:", { userId, username, user });

  // signaling
  const { status, peer, roomId, start, next, end, socket } = useSignaling(
    useMemo(
      () => ({
        userId: userId ?? "",
        username,
        gender: user?.gender,
        genderPreference: gender as string,
      }),
      [userId, username, user?.gender, gender]
    )
  );

  // text chat
  const {
    messages: chatMessages,
    send: sendChatMessage,
    reset: clearChat,
  } = useRoomChat({
    socket,
    roomId: roomId ?? null,
    selfUserId: userId ?? "",
    selfUsername: username,
  });

  // --- WebRTC hook ---
  const {
    cleanupRemote,
    toggleAudio,
    toggleVideo,
    attachLocal,
    attachRemote,
    connected,
  } = useWebRTC({
    socket,
    roomId: roomId ?? null,
    selfUserId: userId ?? "",
    localStreamRef,
  });

  useEffect(() => {
    const enablePlayback = () => {
      console.log(
        "[Mobile] 📱 User interaction detected - enabling video playback"
      );
      setUserInteracted(true);

      // Force play all videos
      if (selfVideoRef.current?.srcObject) {
        selfVideoRef.current
          .play()
          .catch((e) => console.warn("[Mobile] Self video play failed:", e));
      }
      if (strangerVideoRef.current?.srcObject) {
        strangerVideoRef.current
          .play()
          .catch((e) => console.warn("[Mobile] Remote video play failed:", e));
      }
    };

    // Listen for first interaction (required for iOS)
    document.addEventListener("touchstart", enablePlayback, {
      once: true,
      passive: true,
    });
    document.addEventListener("click", enablePlayback, { once: true });

    return () => {
      document.removeEventListener("touchstart", enablePlayback);
      document.removeEventListener("click", enablePlayback);
    };
  }, []);

  useEffect(() => {
    if (!strangerVideoRef.current) return;

    const video = strangerVideoRef.current;

    const checkStream = () => {
      const stream = video.srcObject;
      const hasActiveStream = stream instanceof MediaStream && stream.active;
      setRemoteStreamReady(hasActiveStream);
      console.log("[VideoChatPage] Remote stream status:", {
        hasStream: !!stream,
        active: hasActiveStream,
        videoTracks:
          stream instanceof MediaStream ? stream.getVideoTracks().length : 0,
      });
    };

    // Check immediately
    checkStream();

    // Monitor for stream changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "srcobject"
        ) {
          checkStream();

          // Mobile fix: Force play on stream change
          if (video.srcObject) {
            setTimeout(() => {
              video.play().catch((e) => {
                console.warn(
                  "[VideoChatPage] Remote play failed after stream change:",
                  e
                );
              });
            }, 100);
          }
        }
      });
    });

    observer.observe(video, {
      attributes: true,
      attributeFilter: ["srcObject"],
    });

    // Listen for metadata loaded (critical for mobile)
    const onMetadataLoaded = () => {
      console.log("[VideoChatPage] Remote video metadata loaded");
      checkStream();
      video.play().catch(() => {});
    };

    video.addEventListener("loadedmetadata", onMetadataLoaded);

    // Periodic check for mobile (ensures video plays even if events are missed)
    const interval = setInterval(() => {
      checkStream();

      // Force play if stream exists but video is paused
      if (video.srcObject && video.paused && userInteracted) {
        video.play().catch(() => {});
      }
    }, 1000);

    return () => {
      observer.disconnect();
      video.removeEventListener("loadedmetadata", onMetadataLoaded);
      clearInterval(interval);
    };
  }, [userInteracted]);

  useEffect(() => {
    if (strangerVideoRef.current && attachRemote) {
      console.log("[VideoChatPage] Attaching remote video element");
      attachRemote(strangerVideoRef.current);
    }
  }, [attachRemote]);

  useEffect(() => {
    if (!connected || !strangerVideoRef.current) return;

    console.log(
      "[VideoChatPage] Connection established, ensuring remote video plays"
    );

    const video = strangerVideoRef.current;

    // Wait a moment for stream to be ready
    setTimeout(() => {
      if (attachRemote) {
        attachRemote(video);
      }

      // Force play
      setTimeout(() => {
        if (video.srcObject) {
          video.play().catch((e) => {
            console.warn(
              "[VideoChatPage] Remote video play failed after connection:",
              e
            );
          });
        }
      }, 300);
    }, 500);
  }, [connected, attachRemote]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user?.email || !userId) {
      router.replace("/api/auth/signin");
    }
  }, [sessionStatus, session, userId, router]);

  useEffect(() => {
    if (!userId || sessionStatus !== "authenticated") return;

    let mounted = true;
    let stream: MediaStream | null = null;

    const startLocalStream = async () => {
      try {
        console.log("[Camera] 📹 Requesting local media...");
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!mounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        stream = mediaStream;
        localStreamRef.current = mediaStream;
        setLocalStreamReady(true);

        console.log("[Camera] ✅ Local stream acquired:", {
          videoTracks: mediaStream.getVideoTracks().length,
          audioTracks: mediaStream.getAudioTracks().length,
          videoSettings: mediaStream.getVideoTracks()[0]?.getSettings(),
        });

        // Attach to video element
        if (selfVideoRef.current) {
          const video = selfVideoRef.current;
          video.srcObject = mediaStream;
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;

          // Force explicit styles for mobile
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.objectFit = "cover";

          // Play with error handling
          setTimeout(() => {
            video.play().catch((err) => {
              console.warn("[Camera] Local video autoplay blocked:", err);
              // Will be played after user interaction
            });
          }, 100);
        }

        // Notify WebRTC hook
        if (attachLocal && selfVideoRef.current) {
          attachLocal(selfVideoRef.current);
        }
      } catch (err) {
        console.error("[Camera] ❌ Camera access failed:", err);
        toast.error("Please allow camera & microphone access");
      }
    };

    startLocalStream();

    return () => {
      mounted = false;
      console.log("[Camera] Component effect cleanup (stream preserved)");
    };
  }, [userId, sessionStatus, attachLocal]);

  useEffect(() => {
    if (!localStreamReady || !localStreamRef.current) return;

    if (
      selfVideoRef.current &&
      selfVideoRef.current.srcObject !== localStreamRef.current
    ) {
      console.log("[VideoChatPage] Re-attaching local stream to self video");
      selfVideoRef.current.srcObject = localStreamRef.current;
      selfVideoRef.current.style.width = "100%";
      selfVideoRef.current.style.height = "100%";
      selfVideoRef.current.style.objectFit = "cover";
      selfVideoRef.current.play().catch(() => {});
    }
  }, [localStreamReady]);

  useEffect(() => {
    if (!userId || hasStartedRef.current) return;

    const unsubscribe = onAuthOk(() => {
      if (!hasStartedRef.current && (status === "idle" || status === "ended")) {
        hasStartedRef.current = true;
        start();
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [userId, status, start]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }) + " IST"
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    return () => {
      try {
        cleanupRemote();
      } catch (e) {
        console.error("[VideoChatPage] Error during cleanup:", e);
      }
    };
  }, [cleanupRemote]);

  useEffect(() => {
    const stopTracks = () => {
      console.log("[Camera] 🛑 Stopping local tracks (page unload)");
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };

    window.addEventListener("beforeunload", stopTracks);
    return () => {
      window.removeEventListener("beforeunload", stopTracks);
      stopTracks();
    };
  }, []);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    console.log("[Device] 📱 Mobile:", isMobile);
    console.log("[Device] 🍎 iOS:", isIOS);
    console.log(
      "[Device] 📏 Viewport:",
      window.innerWidth,
      "x",
      window.innerHeight
    );
    console.log("[Device] 🌐 User Agent:", navigator.userAgent);
  }, []);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;
    sendChatMessage(text);
    setInputMessage("");
  };

  const handleStart = () => {
    if (!userId) {
      toast.error("Sign in to start matching.");
      router.push("/api/auth/signin");
      return;
    }
    if (status === "matched") return;
    clearChat();
    hasStartedRef.current = false;
    start();
  };

  const handleNext = () => {
    console.log("[Action] 🔄 User pressed NEXT");
    clearChat();
    cleanupRemote();
    setRemoteStreamReady(false);
    hasStartedRef.current = false;

    if (status === "matched" && roomId) {
      setTimeout(() => {
        next();
      }, 200);
    } else {
      start();
    }

    toast.info("Finding next partner...");
  };

  const handleEnd = () => {
    console.log("[Action] ⏹️ User pressed END");
    clearChat();
    cleanupRemote();
    setRemoteStreamReady(false);
    hasStartedRef.current = false;
    end();

    toast.info("Chat ended. Your camera is still on.");
  };

  const handleBackToDashboard = (e: React.MouseEvent) => {
    e.preventDefault();
    handleEnd();
    router.push("/dashboard");
  };

  const onToggleMute = () => {
    toggleAudio();
    setIsMuted((m) => !m);
  };

  const onToggleVideo = () => {
    toggleVideo();
    setIsVideoOff((v) => !v);
  };

  const chatDisabled = !(status === "matched" && roomId && connected);
  const showSearching = status === "searching";
  const showConnecting = status === "matched" && !connected;
  const isFullyConnected = status === "matched" && connected;

  return (
    <div className="min-h-screen bg-[#0a0f0d] flex flex-col font-sans">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 text-white/80">
        <button
          onClick={handleBackToDashboard}
          className="flex items-center gap-2 text-sm hover:text-white transition"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        <div className="flex items-center gap-4">
          {isFullyConnected && (
            <div className="flex items-center gap-2 text-xs font-medium text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Connected</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-medium">
            <Globe size={14} className="text-amber-400" />
            <span className="font-mono">{currentTime}</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col pt-16">
        {/* Video Area */}
        <div className="flex-1 p-4">
          {/* remote fills, self as PiP */}
          <div className="relative md:hidden h-[52vh] min-h-[300px] rounded-lg overflow-hidden bg-black border border-white/10">
            {/* Remote video - FIXED: Always rendered and visible */}
            <video
              ref={strangerVideoRef}
              autoPlay
              playsInline
              muted={false}
              webkit-playsinline="true" // iOS specific
              x-webkit-airplay="allow"
              className="absolute inset-0 w-full h-full object-cover bg-black"
              style={{
                display: "block",
                zIndex: 1,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onLoadedMetadata={(e) => {
                console.log("[Video] Remote metadata loaded");
                e.currentTarget.play().catch(() => {});
              }}
              onCanPlay={(e) => {
                console.log("[Video] Remote can play");
                e.currentTarget.play().catch(() => {});
              }}
            />

            {/* Overlays - FIXED z-index and visibility logic */}
            {showSearching && (
              <div
                className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4"
                style={{ zIndex: 10 }}
              >
                <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-white/80 font-medium">
                  Searching for a partner...
                </p>
              </div>
            )}

            {showConnecting && (
              <div
                className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3"
                style={{ zIndex: 10 }}
              >
                <div className="w-10 h-10 border-4 border-white/40 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-white/70">Connecting…</p>
              </div>
            )}

            {/* No stream placeholder - only show when actually not connected */}
            {isFullyConnected && !remoteStreamReady && (
              <div
                className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3"
                style={{ zIndex: 5 }}
              >
                <VideoOff size={48} className="text-white/40" />
                <p className="text-xs text-white/60">Waiting for video...</p>
              </div>
            )}

            {/* Remote label */}
            {isFullyConnected && (
              <div
                className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border border-white/20"
                style={{ zIndex: 20 }}
              >
                <Users size={12} />
                <span>{peer?.username ?? "Stranger"}</span>
              </div>
            )}

            {/* Self PiP - always visible with proper z-index */}
            <div className="absolute bottom-3 right-3" style={{ zIndex: 25 }}>
              <div className="relative w-28 h-40 sm:w-32 sm:h-48 rounded-lg overflow-hidden border-2 border-white/30 bg-black shadow-2xl">
                <video
                  ref={selfVideoRef}
                  autoPlay
                  muted
                  playsInline
                  webkit-playsinline="true"
                  x-webkit-airplay="allow"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  onLoadedMetadata={(e) => {
                    console.log("[Video] Local metadata loaded");
                    e.currentTarget.play().catch(() => {});
                  }}
                  onCanPlay={(e) => {
                    console.log("[Video] Local can play");
                    e.currentTarget.play().catch(() => {});
                  }}
                />
                {/* Video off overlay */}
                {isVideoOff && (
                  <div
                    className="absolute inset-0 bg-black/90 flex items-center justify-center"
                    style={{ zIndex: 30 }}
                  >
                    <VideoOff size={28} className="text-white/60" />
                  </div>
                )}
                {/* Loading indicator if stream not ready */}
                {!localStreamReady && (
                  <div
                    className="absolute inset-0 bg-black/90 flex items-center justify-center"
                    style={{ zIndex: 30 }}
                  >
                    <div className="w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <div
                  className="absolute bottom-1.5 left-1.5 text-[10px] px-2 py-0.5 rounded-full bg-black/70 text-white/80 border border-white/20 flex items-center gap-1"
                  style={{ zIndex: 31 }}
                >
                  <User size={10} /> You
                </div>
              </div>
            </div>
          </div>

          {/* Desktop/Tablet — original 2-column grid */}
          <div className="hidden md:grid grid-cols-2 gap-4 h-[52vh] min-h-[360px]">
            {/* Self tile */}
            <div className="relative rounded-lg overflow-hidden bg-black/50 border border-white/10">
              <video
                ref={selfVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ display: "block" }}
                x-webkit-airplay="allow"
                webkit-playsinline="true"
              />
              <div className="absolute bottom-3 left-3 text-white bg-black/70 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border border-white/20">
                <User size={12} /> You
              </div>
              {isVideoOff && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
                  <VideoOff size={48} className="text-white/60" />
                </div>
              )}
              {!localStreamReady && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-white/40 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Stranger */}
            <div className="relative rounded-lg overflow-hidden bg-black border border-white/10">
              {showSearching && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-20">
                  <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-white/80 font-medium">
                    Searching for a partner...
                  </p>
                </div>
              )}

              {showConnecting && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-20">
                  <div className="w-10 h-10 border-4 border-white/40 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-white/70">Connecting…</p>
                </div>
              )}

              <video
                ref={strangerVideoRef}
                autoPlay
                playsInline
                muted={false}
                className="w-full h-full object-cover bg-black"
                style={{ display: "block" }}
                x-webkit-airplay="allow"
                webkit-playsinline="true"
              />

              {isFullyConnected && !remoteStreamReady && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 z-10">
                  <VideoOff size={48} className="text-white/40" />
                  <p className="text-xs text-white/60">Waiting for video...</p>
                </div>
              )}

              {isFullyConnected && (
                <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border border-white/20">
                  <Users size={12} />
                  <span>{peer?.username ?? "Stranger"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Panel */}
        <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {/* Chat */}
          <div className="w-full">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
              <div className="h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/20">
                {chatMessages.map((msg) => {
                  if (msg.system) {
                    return (
                      <div
                        key={msg.id}
                        className="text-center text-xs text-white/70 italic select-none"
                      >
                        {msg.text}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.self ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-lg text-sm font-medium ${
                          msg.self
                            ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black"
                            : "bg-white/10 text-white/90"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messageEndRef} />
              </div>

              <form onSubmit={sendMessage} className="mt-4 flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    chatDisabled ? "Not connected" : "Send a message..."
                  }
                  disabled={chatDisabled}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/50 focus:border-amber-400 focus:outline-none transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={chatDisabled || !inputMessage.trim()}
                  className="p-3 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg hover:shadow-lg hover:shadow-amber-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  <Send size={18} className="text-black" />
                </button>
              </form>
            </div>
          </div>

          {/* Right panel */}
          <div className="p-4 space-y-5">
            {/* Keywords */}
            {/* <div className="flex flex-wrap justify-center gap-2">
              {keywords.map((kw, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
                >
                  <span>{kw}</span>
                  <button
                    onClick={() => removeKeyword(i)}
                    className="ml-1 w-4 h-4 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 transition"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div> */}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleEnd}
                className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-full hover:bg-red-500/30 transition"
              >
                <Power size={20} /> End
              </button>

              {status === "matched" ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/30 text-white rounded-full hover:bg-white/20 transition"
                >
                  <RotateCcw size={20} /> Next
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={status === "searching"}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/30 text-white rounded-full hover:bg-white/20 disabled:opacity-60 transition"
                >
                  <RotateCcw size={20} />{" "}
                  {status === "searching" ? "Searching..." : "Start"}
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex justify-center items-center gap-6">
              <button
                onClick={onToggleMute}
                className={`p-4 rounded-full transition ${
                  isMuted
                    ? "bg-red-500/30 border-2 border-red-500/50"
                    : "bg-white/10 border border-white/20 hover:bg-white/20"
                }`}
              >
                {isMuted ? (
                  <MicOff size={22} className="text-red-400" />
                ) : (
                  <Mic size={22} className="text-white" />
                )}
              </button>

              <button
                onClick={onToggleVideo}
                className={`p-4 rounded-full transition ${
                  isVideoOff
                    ? "bg-red-500/30 border-2 border-red-500/50"
                    : "bg-white/10 border border-white/20 hover:bg-white/20"
                }`}
              >
                {isVideoOff ? (
                  <VideoOff size={22} className="text-red-400" />
                ) : (
                  <VideoIcon size={22} className="text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
