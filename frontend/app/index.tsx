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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Animated Game Preview Component
const GamePreviewAnimation = ({ genre, controlScheme, gameData }: any) => {
  const characterX = useRef(new Animated.Value(50)).current;
  const characterY = useRef(new Animated.Value(100)).current;
  const bulletY = useRef(new Animated.Value(-20)).current;
  const enemyX = useRef(new Animated.Value(200)).current;
  const enemyY = useRef(new Animated.Value(20)).current;
  const starOffset = useRef(new Animated.Value(0)).current;
  const groundOffset = useRef(new Animated.Value(0)).current;
  const jumpAnim = useRef(new Animated.Value(0)).current;
  const activeButton = useRef(new Animated.Value(0)).current;
  const dpadDirection = useRef(new Animated.Value(0)).current;
  const particleOpacity = useRef(new Animated.Value(0)).current;
  const carRotation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Background scrolling animation
    Animated.loop(
      Animated.timing(starOffset, {
        toValue: 100,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Ground scrolling for platformers
    Animated.loop(
      Animated.timing(groundOffset, {
        toValue: -100,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Character movement animation
    const moveSequence = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(characterX, {
            toValue: 120,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(dpadDirection, {
            toValue: 1, // right
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(characterX, {
            toValue: 50,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(dpadDirection, {
            toValue: -1, // left
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    moveSequence.start();

    // Jump animation (periodic)
    const jumpSequence = Animated.loop(
      Animated.sequence([
        Animated.delay(2000),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(jumpAnim, {
              toValue: -40,
              duration: 300,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(jumpAnim, {
              toValue: 0,
              duration: 300,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(activeButton, {
              toValue: 2, // B button
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.delay(500),
            Animated.timing(activeButton, {
              toValue: 0,
              duration: 50,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    );
    jumpSequence.start();

    // Shooting animation (for shooter/action genres)
    if (genre === 'shooter' || genre === 'action') {
      const shootSequence = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(bulletY, {
              toValue: -150,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(activeButton, {
              toValue: 1, // A button
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(particleOpacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(bulletY, {
              toValue: -20,
              duration: 10,
              useNativeDriver: true,
            }),
            Animated.timing(activeButton, {
              toValue: 0,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(particleOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(800),
        ])
      );
      shootSequence.start();
    }

    // Enemy movement
    Animated.loop(
      Animated.sequence([
        Animated.timing(enemyX, {
          toValue: 80,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(enemyX, {
          toValue: 200,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Racing car wobble
    if (genre === 'racing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(carRotation, {
            toValue: 0.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(carRotation, {
            toValue: -0.1,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [genre]);

  const getGenreColors = () => {
    switch (genre) {
      case 'shooter': return { bg1: '#0f0f23', bg2: '#1a1a3e', accent: '#FF6B6B' };
      case 'action': return { bg1: '#1a0f0f', bg2: '#2e1a1a', accent: '#FF9500' };
      case 'puzzle': return { bg1: '#0f1a1a', bg2: '#1a2e2e', accent: '#4ECDC4' };
      case 'adventure': return { bg1: '#0f1a0f', bg2: '#1a2e1a', accent: '#45B7D1' };
      case 'arcade': return { bg1: '#1a1a0f', bg2: '#2e2e1a', accent: '#96CEB4' };
      case 'racing': return { bg1: '#1a0f1a', bg2: '#2e1a2e', accent: '#FFEAA7' };
      case 'rpg': return { bg1: '#1a0f1a', bg2: '#2e1a2e', accent: '#DDA0DD' };
      default: return { bg1: '#0a0a0f', bg2: '#1a1a2e', accent: '#4ECDC4' };
    }
  };

  const colors = getGenreColors();

  // Render stars for space games
  const renderStars = () => {
    const stars = [];
    for (let i = 0; i < 20; i++) {
      stars.push(
        <Animated.View
          key={i}
          style={[
            styles.star,
            {
              left: (i * 17) % 100 + '%',
              top: (i * 23) % 80 + '%',
              transform: [{ translateY: starOffset }],
              opacity: 0.3 + (i % 3) * 0.3,
            },
          ]}
        />
      );
    }
    return stars;
  };

  // Render ground tiles for platformers
  const renderGround = () => (
    <Animated.View 
      style={[
        styles.groundContainer,
        { transform: [{ translateX: groundOffset }] }
      ]}
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[styles.groundTile, { backgroundColor: colors.accent + '40' }]} />
      ))}
    </Animated.View>
  );

  // Render the character based on genre
  const renderCharacter = () => {
    if (genre === 'racing') {
      return (
        <Animated.View
          style={[
            styles.racingCar,
            {
              transform: [
                { translateX: characterX },
                { rotate: carRotation.interpolate({
                  inputRange: [-0.1, 0.1],
                  outputRange: ['-5deg', '5deg'],
                }) },
              ],
            },
          ]}
        >
          <View style={[styles.carBody, { backgroundColor: colors.accent }]} />
          <View style={styles.carWindow} />
          <View style={[styles.carWheel, styles.carWheelLeft]} />
          <View style={[styles.carWheel, styles.carWheelRight]} />
        </Animated.View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.character,
          {
            transform: [
              { translateX: characterX },
              { translateY: Animated.add(characterY, jumpAnim) },
            ],
          },
        ]}
      >
        <View style={[styles.characterHead, { backgroundColor: colors.accent }]} />
        <View style={[styles.characterBody, { backgroundColor: colors.accent }]} />
        <View style={styles.characterLegs}>
          <View style={[styles.characterLeg, { backgroundColor: colors.accent + 'CC' }]} />
          <View style={[styles.characterLeg, { backgroundColor: colors.accent + 'CC' }]} />
        </View>
        {/* Weapon for shooter */}
        {(genre === 'shooter' || genre === 'action') && (
          <View style={[styles.weapon, { backgroundColor: '#888' }]} />
        )}
      </Animated.View>
    );
  };

  // Render bullets for shooter
  const renderBullets = () => {
    if (genre !== 'shooter' && genre !== 'action') return null;
    return (
      <>
        <Animated.View
          style={[
            styles.bullet,
            {
              transform: [
                { translateX: Animated.add(characterX, new Animated.Value(15)) },
                { translateY: Animated.add(characterY, bulletY) },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.muzzleFlash,
            {
              opacity: particleOpacity,
              transform: [
                { translateX: Animated.add(characterX, new Animated.Value(12)) },
                { translateY: Animated.add(characterY, new Animated.Value(-5)) },
              ],
            },
          ]}
        />
      </>
    );
  };

  // Render enemy
  const renderEnemy = () => (
    <Animated.View
      style={[
        styles.enemy,
        {
          transform: [
            { translateX: enemyX },
            { translateY: enemyY },
          ],
        },
      ]}
    >
      <View style={[styles.enemyBody, { backgroundColor: '#FF4444' }]} />
      <View style={styles.enemyEyes}>
        <View style={styles.enemyEye} />
        <View style={styles.enemyEye} />
      </View>
    </Animated.View>
  );

  // Render control overlay
  const renderControlOverlay = () => {
    if (controlScheme === 'swipe') {
      return (
        <View style={styles.swipeOverlay}>
          <Animated.View style={[styles.swipeIndicator, { opacity: 0.6 }]}>
            <Ionicons name="swap-horizontal" size={24} color="#fff" />
            <Text style={styles.swipeText}>Swipe to move</Text>
          </Animated.View>
        </View>
      );
    }

    return (
      <View style={styles.controlOverlay}>
        {/* D-Pad */}
        <View style={styles.dpadOverlay}>
          <Animated.View style={[styles.dpadBtnUp, dpadDirection.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: ['#333', '#333', '#333'],
          }) && styles.dpadBtnActive]} />
          <View style={styles.dpadRow}>
            <Animated.View 
              style={[
                styles.dpadBtnLeft,
                {
                  backgroundColor: dpadDirection.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ['#4ECDC4', '#333', '#333'],
                  }),
                },
              ]} 
            />
            <View style={styles.dpadCenter} />
            <Animated.View 
              style={[
                styles.dpadBtnRight,
                {
                  backgroundColor: dpadDirection.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ['#333', '#333', '#4ECDC4'],
                  }),
                },
              ]} 
            />
          </View>
          <View style={styles.dpadBtnDown} />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsOverlay}>
          <View style={styles.btnRowOverlay}>
            <Animated.View 
              style={[
                styles.actionBtnOverlay, 
                { backgroundColor: '#FF6B6B' },
                {
                  transform: [{
                    scale: activeButton.interpolate({
                      inputRange: [0, 1, 2, 3, 4],
                      outputRange: [1, 1.3, 1, 1, 1],
                    }),
                  }],
                },
              ]}
            >
              <Text style={styles.btnLabelOverlay}>A</Text>
            </Animated.View>
            <Animated.View 
              style={[
                styles.actionBtnOverlay, 
                { backgroundColor: '#4ECDC4' },
                {
                  transform: [{
                    scale: activeButton.interpolate({
                      inputRange: [0, 1, 2, 3, 4],
                      outputRange: [1, 1, 1.3, 1, 1],
                    }),
                  }],
                },
              ]}
            >
              <Text style={styles.btnLabelOverlay}>B</Text>
            </Animated.View>
          </View>
          <View style={styles.btnRowOverlay}>
            <View style={[styles.actionBtnOverlay, { backgroundColor: '#FFE66D' }]}>
              <Text style={styles.btnLabelOverlay}>C</Text>
            </View>
            <View style={[styles.actionBtnOverlay, { backgroundColor: '#95E1D3' }]}>
              <Text style={styles.btnLabelOverlay}>D</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.gamePreviewContainer}>
      <LinearGradient colors={[colors.bg1, colors.bg2]} style={styles.gameScreen}>
        {/* Background elements */}
        {(genre === 'shooter' || genre === 'adventure') && renderStars()}
        
        {/* Ground for platformers */}
        {(genre === 'arcade' || genre === 'puzzle' || genre === 'rpg') && renderGround()}
        
        {/* Racing track lines */}
        {genre === 'racing' && (
          <View style={styles.trackLines}>
            <Animated.View style={[styles.trackLine, { transform: [{ translateY: starOffset }] }]} />
            <Animated.View style={[styles.trackLine, styles.trackLine2, { transform: [{ translateY: starOffset }] }]} />
          </View>
        )}

        {/* Game elements */}
        {renderCharacter()}
        {renderBullets()}
        {renderEnemy()}

        {/* HUD */}
        <View style={styles.gameHUD}>
          <View style={styles.hudItem}>
            <Ionicons name="heart" size={12} color="#FF6B6B" />
            <Text style={styles.hudText}>100</Text>
          </View>
          <View style={styles.hudItem}>
            <Ionicons name="star" size={12} color="#FFE66D" />
            <Text style={styles.hudText}>0</Text>
          </View>
        </View>

        {/* Genre label */}
        <View style={styles.genreLabel}>
          <Text style={styles.genreLabelText}>{genre?.toUpperCase()} PREVIEW</Text>
        </View>
      </LinearGradient>

      {/* Control overlay */}
      {renderControlOverlay()}

      {/* Play indicator */}
      <View style={styles.playIndicator}>
        <Ionicons name="play-circle" size={20} color="#4ECDC4" />
        <Text style={styles.playText}>Live Preview</Text>
      </View>
    </View>
  );
};

// Genre data
const GENRES = [
  { id: 'action', name: 'Action Games', icon: 'flash', color: '#FF6B6B' },
  { id: 'puzzle', name: 'Puzzle Games', icon: 'extension-puzzle', color: '#4ECDC4' },
  { id: 'adventure', name: 'Adventure', icon: 'compass', color: '#45B7D1' },
  { id: 'arcade', name: 'Arcade', icon: 'game-controller', color: '#96CEB4' },
  { id: 'racing', name: 'Racing Game', icon: 'car-sport', color: '#FFEAA7' },
  { id: 'rpg', name: 'RPG', icon: 'shield', color: '#DDA0DD' },
  { id: 'shooter', name: 'Shooter Game', icon: 'locate', color: '#FF7675' },
];

const PLATFORMS = [
  { id: 'javascript', name: 'JavaScript/HTML5', icon: 'logo-javascript' },
  { id: 'unity', name: 'Unity C#', icon: 'cube' },
  { id: 'unreal', name: 'Unreal C++', icon: 'hardware-chip' },
];

const EXAMPLE_PROMPTS = [
  'A space shooter where you defend Earth from alien invasion...',
  'A puzzle platformer with gravity-switching mechanics...',
  'A retro-style racing game with power-ups and shortcuts...',
  'An RPG adventure in a magical forest with mystical creatures...',
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
      <Text style={styles.sectionTitle}>Select Genre</Text>
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
        {EXAMPLE_PROMPTS.map((example, index) => (
          <TouchableOpacity
            key={index}
            style={styles.exampleChip}
            onPress={() => handleExamplePrompt(example)}
          >
            <Text style={styles.exampleText} numberOfLines={1}>
              {example.substring(0, 30)}...
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
            <Text style={styles.footerText}>© 2025 Game Generator • Powered by AI</Text>
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
});
