import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Easing,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Video-Style Game Preview Component - AI Generated Scenes
const GameVideoPreview = ({ genre, gameData, prompt, characterDescription }: any) => {
  const [sceneImages, setSceneImages] = useState<string[]>([]);
  const [currentScene, setCurrentScene] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Generate video scenes based on user's prompt
  const generateVideoScenes = async () => {
    if (!gameData?.schema || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    const newScenes: string[] = [];
    
    // Generate multiple scenes that tell a story
    const scenePrompts = [
      {
        description: `Opening shot: ${gameData.schema.initial_scene?.setting || prompt}`,
        action: 'establishing wide shot, character visible in environment'
      },
      {
        description: `Action shot: ${gameData.schema.initial_scene?.player_action || 'Character in motion'}`,
        action: 'dynamic action pose, motion blur, dramatic angle'
      },
      {
        description: `Close-up: ${gameData.schema.main_character?.name || 'The hero'} preparing for ${gameData.schema.initial_scene?.mechanic || 'combat'}`,
        action: 'detailed character shot, intense expression, ready for action'
      },
      {
        description: `Gameplay moment: ${gameData.schema.initial_scene?.success_outcome || 'Epic gameplay scene'}`,
        action: 'peak action moment, visual effects, cinematic composition'
      }
    ];

    for (let i = 0; i < scenePrompts.length; i++) {
      setGenerationStatus(`Generating scene ${i + 1} of ${scenePrompts.length}...`);
      
      try {
        const response = await fetch(`${API_URL}/api/generate-video-scene`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            genre: genre,
            scene_description: scenePrompts[i].description,
            character_description: characterDescription || gameData.schema.main_character?.description,
            action: scenePrompts[i].action,
            scene_number: i + 1,
            total_scenes: scenePrompts.length,
            user_prompt: prompt
          }),
        });
        
        const data = await response.json();
        if (data.success && data.image_data) {
          newScenes.push(`data:${data.mime_type};base64,${data.image_data}`);
        }
      } catch (err) {
        console.log(`Scene ${i + 1} generation error:`, err);
      }
      
      // Small delay between generations
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (newScenes.length > 0) {
      setSceneImages(newScenes);
      startSceneRotation(newScenes.length);
    } else {
      setError('Could not generate video scenes. Using placeholder.');
    }
    
    setIsGenerating(false);
    setGenerationStatus('');
  };

  // Auto-rotate through scenes like a video
  const startSceneRotation = (totalScenes: number) => {
    let sceneIndex = 0;
    
    const rotateScene = () => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        sceneIndex = (sceneIndex + 1) % totalScenes;
        setCurrentScene(sceneIndex);
        
        // Slide and fade in
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      });
    };
    
    const interval = setInterval(rotateScene, 4000);
    return () => clearInterval(interval);
  };

  useEffect(() => {
    if (gameData?.schema) {
      generateVideoScenes();
    }
  }, [gameData]);

  const getGenreColors = () => {
    switch (genre) {
      case 'shooter': return { primary: '#FF4444', secondary: '#FF8888', bg: '#1a0a0a' };
      case 'racing': return { primary: '#FFEAA7', secondary: '#FFD93D', bg: '#1a1a0a' };
      case 'sports': return { primary: '#44FF44', secondary: '#88FF88', bg: '#0a1a0a' };
      case 'adventure': return { primary: '#45B7D1', secondary: '#7DD3E8', bg: '#0a1a1a' };
      case 'fighting': return { primary: '#FF6B6B', secondary: '#FF9B9B', bg: '#1a0a0a' };
      case 'rpg': return { primary: '#DDA0DD', secondary: '#E8C8E8', bg: '#1a0a1a' };
      case 'platformer': return { primary: '#96CEB4', secondary: '#B8E0CE', bg: '#0a1a0f' };
      case 'horror': return { primary: '#8B0000', secondary: '#B22222', bg: '#0a0505' };
      case 'simulation': return { primary: '#87CEEB', secondary: '#ADD8E6', bg: '#0a0f1a' };
      case 'puzzle': return { primary: '#4ECDC4', secondary: '#7EDDD6', bg: '#0a1a1a' };
      default: return { primary: '#4ECDC4', secondary: '#7EDDD6', bg: '#0a0a0f' };
    }
  };

  const colors = getGenreColors();

  return (
    <View style={styles.videoPreviewContainer}>
      {/* Main Video Display - No overlays, just the AI generated scene */}
      <View style={styles.videoScreen}>
        {isGenerating ? (
          <LinearGradient colors={[colors.bg, '#000']} style={styles.videoPlaceholder}>
            <View style={styles.generatingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.generatingTitle}>Generating Your Game Video</Text>
              <Text style={styles.generatingStatus}>{generationStatus}</Text>
              <View style={styles.generatingDetails}>
                <Text style={styles.generatingDetail}>Genre: {genre?.toUpperCase()}</Text>
                <Text style={styles.generatingDetail}>Creating cinematic scenes...</Text>
              </View>
            </View>
          </LinearGradient>
        ) : sceneImages.length > 0 ? (
          <Animated.View 
            style={[
              styles.sceneContainer,
              { 
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }]
              }
            ]}
          >
            <Image 
              source={{ uri: sceneImages[currentScene] }} 
              style={styles.sceneImage}
              resizeMode="cover"
            />
            {/* Cinematic bars for video feel */}
            <View style={styles.cinematicBarTop} />
            <View style={styles.cinematicBarBottom} />
            
            {/* Scene indicator */}
            <View style={styles.sceneIndicator}>
              {sceneImages.map((_, index) => (
                <View 
                  key={index}
                  style={[
                    styles.sceneIndicatorDot,
                    currentScene === index && { backgroundColor: colors.primary }
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        ) : (
          <LinearGradient colors={[colors.bg, '#000']} style={styles.videoPlaceholder}>
            <View style={styles.placeholderContent}>
              <Ionicons name="videocam" size={50} color={colors.primary} />
              <Text style={styles.placeholderTitle}>Video Preview</Text>
              <Text style={styles.placeholderText}>
                {error || 'AI-generated game footage will appear here'}
              </Text>
              {gameData?.schema?.initial_scene?.setting && (
                <View style={styles.scenePreviewText}>
                  <Text style={styles.sceneLabel}>Scene:</Text>
                  <Text style={styles.sceneDescription}>
                    {gameData.schema.initial_scene.setting}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        )}
      </View>

      {/* Video Info Bar - Minimal, no game controls */}
      <View style={styles.videoInfoBar}>
        <View style={styles.videoInfoLeft}>
          <View style={[styles.genreBadge, { backgroundColor: colors.primary + '30' }]}>
            <Text style={[styles.genreBadgeText, { color: colors.primary }]}>
              {genre?.toUpperCase()} GAME
            </Text>
          </View>
        </View>
        <View style={styles.videoInfoCenter}>
          <Text style={styles.videoTitle}>
            {gameData?.game?.name || 'Generated Game'}
          </Text>
        </View>
        <View style={styles.videoInfoRight}>
          <TouchableOpacity 
            style={styles.regenerateBtn}
            onPress={generateVideoScenes}
            disabled={isGenerating}
          >
            <Ionicons name="refresh" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Genre data - All 3D Game Types
// Genre data - All 3D Game Types
const GENRES = [
  { id: 'shooter', name: '3D Shooter', icon: 'locate', color: '#FF4444', description: 'FPS/TPS Action' },
  { id: 'racing', name: '3D Racing', icon: 'car-sport', color: '#FFEAA7', description: 'High Speed' },
  { id: 'sports', name: '3D Sports', icon: 'football', color: '#44FF44', description: 'Pro Sports' },
  { id: 'adventure', name: '3D Adventure', icon: 'compass', color: '#45B7D1', description: 'Open World' },
  { id: 'fighting', name: '3D Fighting', icon: 'hand-left', color: '#FF6B6B', description: 'Combat' },
  { id: 'rpg', name: '3D RPG', icon: 'shield', color: '#DDA0DD', description: 'Fantasy' },
  { id: 'platformer', name: '3D Platformer', icon: 'walk', color: '#96CEB4', description: 'Jump & Run' },
  { id: 'horror', name: '3D Horror', icon: 'skull', color: '#8B0000', description: 'Survival' },
  { id: 'simulation', name: '3D Simulation', icon: 'airplane', color: '#87CEEB', description: 'Realistic' },
  { id: 'puzzle', name: '3D Puzzle', icon: 'extension-puzzle', color: '#4ECDC4', description: 'Brain Teaser' },
];

const PLATFORMS = [
  { id: 'javascript', name: 'JavaScript/HTML5', icon: 'logo-javascript' },
  { id: 'unity', name: 'Unity C#', icon: 'cube' },
  { id: 'unreal', name: 'Unreal C++', icon: 'hardware-chip' },
];

// Genre-specific example prompts
const GENRE_PROMPTS: { [key: string]: string[] } = {
  shooter: [
    'A military shooter in a war-torn city with tactical combat...',
    'A sci-fi shooter on a space station fighting alien invaders...',
    'A zombie apocalypse shooter in an abandoned mall...',
  ],
  racing: [
    'A street racing game in neon-lit Tokyo at night...',
    'A Formula 1 simulator on famous world circuits...',
    'An off-road rally racing through muddy jungle trails...',
  ],
  sports: [
    'A professional football game in a packed stadium...',
    'A basketball street court 3v3 competition...',
    'A soccer World Cup final match experience...',
  ],
  adventure: [
    'An ancient ruins explorer discovering lost civilizations...',
    'A jungle adventure searching for hidden treasure...',
    'A mountaineering expedition to reach the summit...',
  ],
  fighting: [
    'A martial arts tournament with diverse fighting styles...',
    'A street fighting game in urban environments...',
    'A fantasy combat game with magical abilities...',
  ],
  rpg: [
    'A medieval knight quest to slay a dragon...',
    'A mage academy student learning powerful spells...',
    'An epic journey to save the kingdom from darkness...',
  ],
  platformer: [
    'A colorful world hopping adventure with collectibles...',
    'A robot running through futuristic floating cities...',
    'A magical forest platformer with elemental powers...',
  ],
  horror: [
    'A haunted mansion exploration with supernatural enemies...',
    'A hospital survival horror escaping experiments...',
    'A dark forest survival against unknown creatures...',
  ],
  simulation: [
    'A commercial airline pilot flying global routes...',
    'A farming simulator building the ultimate farm...',
    'A city builder creating a metropolis from scratch...',
  ],
  puzzle: [
    'A portal-based puzzle game manipulating space...',
    'A physics puzzle solving ancient temple mechanisms...',
    'A time-manipulation puzzle changing past and future...',
  ],
};

const DEFAULT_PROMPTS = [
  'A space shooter where you defend Earth from alien invasion...',
  'A high-speed racing game through neon city streets...',
  'An RPG adventure in a magical forest with mystical creatures...',
  'A survival horror game in an abandoned hospital...',
];

export default function GameGenerator() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [characterDescription, setCharacterDescription] = useState('');
  const [controlScheme, setControlScheme] = useState('dpad_buttons');
  const [targetPlatform, setTargetPlatform] = useState('javascript');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGame, setGeneratedGame] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Get example prompts based on selected genre
  const getExamplePrompts = () => {
    if (selectedGenre && GENRE_PROMPTS[selectedGenre]) {
      return GENRE_PROMPTS[selectedGenre];
    }
    return DEFAULT_PROMPTS;
  };

  useEffect(() => {
    // Pulse animation for the generate button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleGenerate = async () => {
    if (!selectedGenre || !prompt.trim()) {
      setError('Please select a genre and enter a game description');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/games/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          genre: selectedGenre,
          character_description: characterDescription.trim() || 'A brave hero',
          control_scheme: controlScheme,
          target_platform: targetPlatform,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to generate game');
      }

      setGeneratedGame(data);
      setShowPreview(true);
      
      // Animate slide up
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      setError(err.message || 'Failed to generate game');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExamplePrompt = (example: string) => {
    setPrompt(example);
  };

  const renderGenreSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select 3D Game Genre</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
        {GENRES.map((genre) => (
          <TouchableOpacity
            key={genre.id}
            style={[
              styles.genreCard,
              selectedGenre === genre.id && { borderColor: genre.color, borderWidth: 2 },
            ]}
            onPress={() => setSelectedGenre(genre.id)}
          >
            <View style={[styles.genreIconContainer, { backgroundColor: genre.color + '20' }]}>
              <Ionicons name={genre.icon as any} size={28} color={genre.color} />
            </View>
            <Text style={styles.genreName}>{genre.name}</Text>
            <Text style={styles.genreDescription}>{genre.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPromptInput = () => (
    <View style={styles.section}>
      <View style={styles.promptHeader}>
        <Text style={styles.sectionTitle}>Describe Your Game</Text>
        <Text style={styles.charCount}>{prompt.length} / 500</Text>
      </View>
      <View style={styles.promptContainer}>
        <TextInput
          style={styles.promptInput}
          placeholder="Describe the game you want to create..."
          placeholderTextColor="#666"
          multiline
          maxLength={500}
          value={prompt}
          onChangeText={setPrompt}
        />
      </View>
      <Text style={styles.exampleLabel}>Try an example:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examplesScroll}>
        {getExamplePrompts().map((example, index) => (
          <TouchableOpacity
            key={index}
            style={styles.exampleChip}
            onPress={() => handleExamplePrompt(example)}
          >
            <Text style={styles.exampleText} numberOfLines={1}>
              {example.substring(0, 35)}...
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCharacterInput = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Character Description</Text>
      <TextInput
        style={styles.characterInput}
        placeholder="Describe your main character..."
        placeholderTextColor="#666"
        value={characterDescription}
        onChangeText={setCharacterDescription}
        maxLength={200}
      />
    </View>
  );

  const renderControlScheme = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Control Scheme</Text>
      <View style={styles.controlOptions}>
        <TouchableOpacity
          style={[
            styles.controlOption,
            controlScheme === 'dpad_buttons' && styles.controlOptionSelected,
          ]}
          onPress={() => setControlScheme('dpad_buttons')}
        >
          <View style={styles.controlPreview}>
            <View style={styles.dpadPreview}>
              <View style={styles.dpadUp} />
              <View style={styles.dpadHorizontal}>
                <View style={styles.dpadLeft} />
                <View style={styles.dpadCenter} />
                <View style={styles.dpadRight} />
              </View>
              <View style={styles.dpadDown} />
            </View>
            <View style={styles.buttonsPreview}>
              <View style={[styles.actionButton, styles.buttonA]}>
                <Text style={styles.buttonLabel}>A</Text>
              </View>
              <View style={[styles.actionButton, styles.buttonB]}>
                <Text style={styles.buttonLabel}>B</Text>
              </View>
              <View style={[styles.actionButton, styles.buttonC]}>
                <Text style={styles.buttonLabel}>C</Text>
              </View>
              <View style={[styles.actionButton, styles.buttonD]}>
                <Text style={styles.buttonLabel}>D</Text>
              </View>
            </View>
          </View>
          <Text style={styles.controlTitle}>D-Pad + ABCD</Text>
          <Text style={styles.controlDesc}>Classic controller layout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlOption,
            controlScheme === 'swipe' && styles.controlOptionSelected,
          ]}
          onPress={() => setControlScheme('swipe')}
        >
          <View style={styles.swipePreview}>
            <Ionicons name="hand-left" size={40} color="#4ECDC4" />
            <View style={styles.swipeArrows}>
              <Ionicons name="arrow-up" size={16} color="#666" />
              <View style={styles.swipeRow}>
                <Ionicons name="arrow-back" size={16} color="#666" />
                <Ionicons name="arrow-forward" size={16} color="#666" />
              </View>
              <Ionicons name="arrow-down" size={16} color="#666" />
            </View>
          </View>
          <Text style={styles.controlTitle}>Swipe Controls</Text>
          <Text style={styles.controlDesc}>Touch-based movement</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlatformSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Target Platform</Text>
      <View style={styles.platformOptions}>
        {PLATFORMS.map((platform) => (
          <TouchableOpacity
            key={platform.id}
            style={[
              styles.platformOption,
              targetPlatform === platform.id && styles.platformSelected,
            ]}
            onPress={() => setTargetPlatform(platform.id)}
          >
            <Ionicons
              name={platform.icon as any}
              size={24}
              color={targetPlatform === platform.id ? '#4ECDC4' : '#888'}
            />
            <Text
              style={[
                styles.platformName,
                targetPlatform === platform.id && styles.platformNameSelected,
              ]}
            >
              {platform.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderGenerateButton = () => (
    <Animated.View style={[styles.generateContainer, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity
        style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
        onPress={handleGenerate}
        disabled={isGenerating}
      >
        <LinearGradient
          colors={['#4ECDC4', '#45B7D1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.generateGradient}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.generateText}>Generating...</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={24} color="#fff" />
              <Text style={styles.generateText}>Generate Game</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPreviewModal = () => {
    if (!showPreview || !generatedGame) return null;

    return (
      <Animated.View
        style={[
          styles.previewModal,
          {
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [600, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>
            {generatedGame.game?.name || 'Generated Game'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowPreview(false);
              slideAnim.setValue(0);
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.previewContent}>
          {/* Animated Game Preview */}
          <GamePreviewAnimation 
            genre={selectedGenre} 
            controlScheme={controlScheme}
            gameData={generatedGame}
          />

          {/* Scene Description */}
          <View style={styles.sceneDescriptionBox}>
            <Text style={styles.sceneDescriptionTitle}>Scene Setting</Text>
            <Text style={styles.sceneDescriptionText}>
              {generatedGame.schema?.initial_scene?.setting || 'Loading scene...'}
            </Text>
          </View>

          {/* Control Layout Preview */}
          <View style={styles.controlLayoutPreview}>
            <Text style={styles.controlLayoutTitle}>Control Layout</Text>
            {controlScheme === 'dpad_buttons' ? (
              <View style={styles.controlLayoutDisplay}>
                <View style={styles.controlSide}>
                  <Text style={styles.controlSideLabel}>Left Hand</Text>
                  <View style={styles.dpadLarge}>
                    <View style={styles.dpadUpLarge}><Text style={styles.dpadText}>↑</Text></View>
                    <View style={styles.dpadMiddle}>
                      <View style={styles.dpadLeftLarge}><Text style={styles.dpadText}>←</Text></View>
                      <View style={styles.dpadCenterLarge} />
                      <View style={styles.dpadRightLarge}><Text style={styles.dpadText}>→</Text></View>
                    </View>
                    <View style={styles.dpadDownLarge}><Text style={styles.dpadText}>↓</Text></View>
                  </View>
                </View>
                <View style={styles.controlSide}>
                  <Text style={styles.controlSideLabel}>Right Hand</Text>
                  <View style={styles.buttonsLarge}>
                    <View style={styles.buttonRow}>
                      <View style={[styles.buttonLarge, { backgroundColor: '#FF6B6B' }]}>
                        <Text style={styles.buttonLabelLarge}>A</Text>
                        <Text style={styles.buttonAction}>Shoot</Text>
                      </View>
                      <View style={[styles.buttonLarge, { backgroundColor: '#4ECDC4' }]}>
                        <Text style={styles.buttonLabelLarge}>B</Text>
                        <Text style={styles.buttonAction}>Jump</Text>
                      </View>
                    </View>
                    <View style={styles.buttonRow}>
                      <View style={[styles.buttonLarge, { backgroundColor: '#FFE66D' }]}>
                        <Text style={styles.buttonLabelLarge}>C</Text>
                        <Text style={styles.buttonAction}>Special</Text>
                      </View>
                      <View style={[styles.buttonLarge, { backgroundColor: '#95E1D3' }]}>
                        <Text style={styles.buttonLabelLarge}>D</Text>
                        <Text style={styles.buttonAction}>Boost</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.swipeControlsDisplay}>
                <Text style={styles.swipeInstructions}>
                  Swipe: Move | Tap: Action | Double Tap: Jump | Long Press: Special
                </Text>
              </View>
            )}
          </View>

          {/* Scene Details */}
          <View style={styles.sceneDetails}>
            <Text style={styles.sceneDetailsTitle}>Scene Details</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Mechanic:</Text>
              <Text style={styles.detailValue}>
                {generatedGame.schema?.initial_scene?.mechanic || 'N/A'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Camera:</Text>
              <Text style={styles.detailValue}>
                {generatedGame.schema?.initial_scene?.camera || 'N/A'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailValue}>
                {generatedGame.schema?.initial_scene?.video_length_seconds || 10}s
              </Text>
            </View>
          </View>

          {/* Next Steps */}
          <View style={styles.nextSteps}>
            <Text style={styles.nextStepsTitle}>Next Scene Ideas</Text>
            {generatedGame.next_scene_prompts?.map((prompt: string, index: number) => (
              <View key={index} style={styles.nextPrompt}>
                <Ionicons name="chevron-forward" size={16} color="#4ECDC4" />
                <Text style={styles.nextPromptText}>{prompt}</Text>
              </View>
            ))}
          </View>

          {/* Export Button */}
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="code-download" size={20} color="#fff" />
            <Text style={styles.exportButtonText}>
              Export {targetPlatform.toUpperCase()} Code
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Game Generator</Text>
            <Text style={styles.subtitle}>
              Transform your imagination into playable games with AI
            </Text>
          </View>

          {/* AI Badge */}
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={14} color="#4ECDC4" />
            <Text style={styles.aiBadgeText}>Powered by Planet Q AI</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {renderGenreSelector()}
          {renderPromptInput()}
          {renderCharacterInput()}
          {renderControlScheme()}
          {renderPlatformSelector()}
          {renderGenerateButton()}

          {/* Features */}
          <View style={styles.features}>
            <View style={styles.feature}>
              <Ionicons name="flash" size={24} color="#4ECDC4" />
              <Text style={styles.featureTitle}>AI-Powered</Text>
              <Text style={styles.featureDesc}>Neural networks create unique gameplay</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="play" size={24} color="#4ECDC4" />
              <Text style={styles.featureTitle}>Instant Play</Text>
              <Text style={styles.featureDesc}>Generate and play in seconds</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="infinite" size={24} color="#4ECDC4" />
              <Text style={styles.featureTitle}>Infinite Variety</Text>
              <Text style={styles.featureDesc}>Every game is one-of-a-kind</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 Planet Q Games • Powered by Planet Q AI</Text>
          </View>
        </ScrollView>

        {renderPreviewModal()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC410',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 10,
  },
  aiBadgeText: {
    color: '#4ECDC4',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B20',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 10,
  },
  errorText: {
    color: '#FF6B6B',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  genreScroll: {
    marginLeft: -20,
    paddingLeft: 20,
  },
  genreCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a34',
  },
  genreIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  genreName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  genreDescription: {
    color: '#888',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    color: '#666',
    fontSize: 12,
  },
  promptContainer: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a34',
  },
  promptInput: {
    color: '#fff',
    padding: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  exampleLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  examplesScroll: {
    marginLeft: -20,
    paddingLeft: 20,
  },
  exampleChip: {
    backgroundColor: '#2a2a34',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  exampleText: {
    color: '#888',
    fontSize: 12,
  },
  characterInput: {
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a34',
    color: '#fff',
    padding: 16,
    fontSize: 16,
  },
  controlOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  controlOption: {
    flex: 1,
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a34',
  },
  controlOptionSelected: {
    borderColor: '#4ECDC4',
  },
  controlPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  dpadPreview: {
    alignItems: 'center',
  },
  dpadUp: {
    width: 16,
    height: 16,
    backgroundColor: '#444',
    borderRadius: 2,
  },
  dpadHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dpadLeft: {
    width: 16,
    height: 16,
    backgroundColor: '#444',
    borderRadius: 2,
  },
  dpadCenter: {
    width: 16,
    height: 16,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  dpadRight: {
    width: 16,
    height: 16,
    backgroundColor: '#444',
    borderRadius: 2,
  },
  dpadDown: {
    width: 16,
    height: 16,
    backgroundColor: '#444',
    borderRadius: 2,
  },
  buttonsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 44,
    gap: 2,
  },
  actionButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonA: { backgroundColor: '#FF6B6B' },
  buttonB: { backgroundColor: '#4ECDC4' },
  buttonC: { backgroundColor: '#FFE66D' },
  buttonD: { backgroundColor: '#95E1D3' },
  buttonLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  controlTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  controlDesc: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  swipePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  swipeArrows: {
    alignItems: 'center',
  },
  swipeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  platformOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  platformOption: {
    flex: 1,
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a34',
  },
  platformSelected: {
    borderColor: '#4ECDC4',
  },
  platformName: {
    color: '#888',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  platformNameSelected: {
    color: '#4ECDC4',
  },
  generateContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  generateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  features: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 40,
    gap: 12,
  },
  feature: {
    flex: 1,
    alignItems: 'center',
  },
  featureTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  featureDesc: {
    color: '#666',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingBottom: 20,
  },
  footerText: {
    color: '#444',
    fontSize: 12,
  },
  // Preview Modal Styles
  previewModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '90%',
    backgroundColor: '#0a0a0f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2a2a34',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a34',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {
    flex: 1,
    padding: 20,
  },
  videoPreview: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  videoPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gamePreviewAnimation: {
    alignItems: 'center',
  },
  previewLabel: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  sceneDescription: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  controlLayoutPreview: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  controlLayoutTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  controlLayoutDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlSide: {
    alignItems: 'center',
  },
  controlSideLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 12,
  },
  dpadLarge: {
    alignItems: 'center',
  },
  dpadUpLarge: {
    width: 40,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadMiddle: {
    flexDirection: 'row',
  },
  dpadLeftLarge: {
    width: 40,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenterLarge: {
    width: 40,
    height: 40,
    backgroundColor: '#222',
  },
  dpadRightLarge: {
    width: 40,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadDownLarge: {
    width: 40,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadText: {
    color: '#888',
    fontSize: 16,
  },
  buttonsLarge: {
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabelLarge: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonAction: {
    color: '#fff',
    fontSize: 8,
    opacity: 0.8,
  },
  swipeControlsDisplay: {
    padding: 20,
    alignItems: 'center',
  },
  swipeInstructions: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  sceneDetails: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sceneDetailsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#888',
    fontSize: 14,
    width: 100,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  nextSteps: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  nextStepsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  nextPrompt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nextPromptText: {
    color: '#888',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  exportButton: {
    backgroundColor: '#4ECDC4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 40,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Animated Game Preview Styles
  gamePreviewContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: '#2a2a34',
  },
  gameScreen: {
    height: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  groundContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 30,
  },
  groundTile: {
    width: 50,
    height: 30,
    marginRight: 2,
    borderTopWidth: 2,
    borderTopColor: '#4ECDC4',
  },
  character: {
    position: 'absolute',
    alignItems: 'center',
  },
  characterHead: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 2,
  },
  characterBody: {
    width: 20,
    height: 24,
    borderRadius: 4,
  },
  characterLegs: {
    flexDirection: 'row',
    gap: 4,
  },
  characterLeg: {
    width: 6,
    height: 12,
    borderRadius: 2,
  },
  weapon: {
    position: 'absolute',
    right: -8,
    top: 20,
    width: 12,
    height: 4,
    borderRadius: 2,
  },
  bullet: {
    position: 'absolute',
    width: 4,
    height: 12,
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
  },
  muzzleFlash: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#FFE66D',
    borderRadius: 5,
  },
  enemy: {
    position: 'absolute',
    alignItems: 'center',
  },
  enemyBody: {
    width: 30,
    height: 24,
    borderRadius: 6,
  },
  enemyEyes: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 8,
    top: 6,
  },
  enemyEye: {
    width: 6,
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  racingCar: {
    position: 'absolute',
    bottom: 40,
  },
  carBody: {
    width: 40,
    height: 20,
    borderRadius: 6,
  },
  carWindow: {
    position: 'absolute',
    top: 2,
    left: 10,
    width: 20,
    height: 10,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  carWheel: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#222',
    borderRadius: 5,
    bottom: -4,
  },
  carWheelLeft: {
    left: 4,
  },
  carWheelRight: {
    right: 4,
  },
  trackLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
  },
  trackLine: {
    position: 'absolute',
    width: 4,
    height: 40,
    backgroundColor: '#FFE66D40',
    borderRadius: 2,
    top: 20,
  },
  trackLine2: {
    top: 100,
  },
  gameHUD: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 16,
  },
  hudItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hudText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  genreLabel: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#00000080',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  genreLabelText: {
    color: '#4ECDC4',
    fontSize: 8,
    fontWeight: 'bold',
  },
  controlOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#0a0a0f',
  },
  dpadOverlay: {
    alignItems: 'center',
  },
  dpadBtnUp: {
    width: 28,
    height: 28,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  dpadBtnActive: {
    backgroundColor: '#4ECDC4',
  },
  dpadRow: {
    flexDirection: 'row',
  },
  dpadBtnLeft: {
    width: 28,
    height: 28,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  dpadCenter: {
    width: 28,
    height: 28,
    backgroundColor: '#222',
  },
  dpadBtnRight: {
    width: 28,
    height: 28,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  dpadBtnDown: {
    width: 28,
    height: 28,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  actionButtonsOverlay: {
    gap: 4,
  },
  btnRowOverlay: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtnOverlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabelOverlay: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  swipeOverlay: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
  },
  swipeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swipeText: {
    color: '#888',
    fontSize: 12,
  },
  playIndicator: {
    position: 'absolute',
    bottom: 50,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00000080',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playText: {
    color: '#4ECDC4',
    fontSize: 10,
    fontWeight: '600',
  },
  sceneDescriptionBox: {
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sceneDescriptionTitle: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sceneDescriptionText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 20,
  },
  // Interactive control styles
  dpadArrow: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnActive: {
    transform: [{ scale: 1.2 }],
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  btnActionLabel: {
    color: '#fff',
    fontSize: 7,
    marginTop: 2,
    fontWeight: '600',
  },
  swipeControlArea: {
    padding: 16,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
  },
  swipeTapArea: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  swipeButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  swipeActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  swipeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  boostAura: {
    position: 'absolute',
    width: 40,
    height: 50,
    borderRadius: 20,
    top: -5,
    left: -5,
  },
  // Enhanced Game Preview Styles
  gamePreviewContainerEnhanced: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0a0a0f',
    borderWidth: 2,
    borderColor: '#4ECDC440',
  },
  gameScreenEnhanced: {
    height: 240,
    position: 'relative',
    overflow: 'hidden',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  starLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  starEnhanced: {
    position: 'absolute',
    borderRadius: 10,
  },
  cloudLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  nebula: {
    position: 'absolute',
    borderRadius: 60,
  },
  groundLayerEnhanced: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    height: 40,
  },
  groundSegment: {
    width: 60,
    height: 40,
    marginRight: 2,
  },
  groundGradient: {
    flex: 1,
  },
  atmosphericFog: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  characterEnhanced: {
    position: 'absolute',
    alignItems: 'center',
  },
  characterAura: {
    position: 'absolute',
    width: 50,
    height: 60,
    borderRadius: 25,
    top: -10,
    left: -10,
  },
  boostAuraEnhanced: {
    position: 'absolute',
    width: 60,
    height: 70,
    borderRadius: 30,
    borderWidth: 3,
    top: -15,
    left: -15,
  },
  characterSprite: {
    alignItems: 'center',
  },
  characterHelmet: {
    width: 22,
    height: 20,
    borderRadius: 11,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  helmetVisor: {
    width: 14,
    height: 6,
    borderRadius: 3,
    marginBottom: 3,
  },
  characterArmor: {
    width: 28,
    height: 32,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
  },
  armorGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
  },
  armorDetail: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  characterArm: {
    position: 'absolute',
    width: 8,
    height: 20,
    borderRadius: 4,
    top: 25,
  },
  leftArm: {
    left: -6,
  },
  rightArm: {
    right: -10,
  },
  characterWeapon: {
    position: 'absolute',
    width: 20,
    height: 8,
    borderRadius: 2,
    right: 0,
    top: 5,
  },
  weaponBarrel: {
    position: 'absolute',
    width: 10,
    height: 4,
    right: -8,
    top: 2,
    borderRadius: 2,
  },
  weaponGlow: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    right: -10,
    top: 1,
    opacity: 0.8,
  },
  characterLegsEnhanced: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  characterLegEnhanced: {
    width: 8,
    height: 16,
    borderRadius: 3,
  },
  jetpackFlame: {
    position: 'absolute',
    bottom: -20,
    left: 8,
    alignItems: 'center',
  },
  flameCore: {
    width: 8,
    height: 15,
    borderRadius: 4,
  },
  flameOuter: {
    position: 'absolute',
    width: 14,
    height: 20,
    borderRadius: 7,
    opacity: 0.6,
    top: -2,
  },
  bulletTrail: {
    position: 'absolute',
    width: 3,
    height: 8,
    borderRadius: 1,
  },
  bulletEnhanced: {
    position: 'absolute',
    width: 6,
    height: 16,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bulletGradient: {
    flex: 1,
    borderRadius: 3,
  },
  bulletGlow: {
    position: 'absolute',
    width: 14,
    height: 24,
    borderRadius: 7,
    opacity: 0.4,
  },
  enemyEnhanced: {
    position: 'absolute',
    alignItems: 'center',
  },
  enemyGlow: {
    position: 'absolute',
    width: 60,
    height: 50,
    borderRadius: 30,
    opacity: 0.3,
    top: -10,
    left: -10,
  },
  enemyBodyEnhanced: {
    width: 40,
    height: 30,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
  },
  enemyGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
  enemyEyesEnhanced: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  enemyEyeEnhanced: {
    width: 10,
    height: 10,
    backgroundColor: '#FFF',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enemyPupil: {
    width: 5,
    height: 5,
    backgroundColor: '#000',
    borderRadius: 2.5,
  },
  enemyMouth: {
    width: 16,
    height: 4,
    backgroundColor: '#000',
    borderRadius: 2,
    marginTop: 4,
  },
  enemyWing: {
    position: 'absolute',
    width: 15,
    height: 8,
    backgroundColor: '#FF444480',
    borderRadius: 4,
    top: 10,
  },
  leftWing: {
    left: -12,
    transform: [{ rotate: '-20deg' }],
  },
  rightWing: {
    right: -12,
    transform: [{ rotate: '20deg' }],
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  explosion: {
    position: 'absolute',
    overflow: 'hidden',
  },
  hudEnhanced: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudLeft: {
    flex: 1,
  },
  hudCenter: {
    alignItems: 'center',
  },
  hudRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  hudItemEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  healthBar: {
    width: 50,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    backgroundColor: '#44FF44',
    borderRadius: 3,
  },
  hudTextEnhanced: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  genreLabelTextEnhanced: {
    color: '#4ECDC4',
    fontSize: 10,
    fontWeight: 'bold',
  },
  playableLabel: {
    color: '#FFE66D',
    fontSize: 8,
    fontWeight: 'bold',
  },
  scoreText: {
    color: '#FFE66D',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0a0a10',
  },
  controlsCenter: {
    alignItems: 'center',
  },
  controlsLabel: {
    color: '#666',
    fontSize: 8,
    marginTop: 4,
  },
  dpadContainer: {
    alignItems: 'center',
  },
  dpadBtnEnhanced: {
    width: 36,
    height: 36,
    backgroundColor: '#1a1a24',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  dpadActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  dpadUp: {},
  dpadMiddleRow: {
    flexDirection: 'row',
  },
  dpadLeft: {},
  dpadCenterBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#0a0a10',
  },
  dpadRight: {},
  dpadDown: {},
  actionBtnContainer: {
    gap: 6,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnEnhanced: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF30',
  },
  btnPressed: {
    transform: [{ scale: 0.9 }],
    borderColor: '#FFF',
  },
  btnLetter: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnLabel: {
    color: '#FFF',
    fontSize: 6,
    fontWeight: '600',
  },
});
