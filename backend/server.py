from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import base64
from datetime import datetime
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# LLM Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# ============ MODELS ============

class ControlScheme(BaseModel):
    type: str  # "dpad_buttons" or "swipe"
    description: str

class SceneSchema(BaseModel):
    scene_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    setting: str
    characters: List[str]
    player_action: str
    mechanic: str
    success_outcome: str
    failure_outcome: str
    video_length_seconds: int = 6
    camera: Optional[str] = None
    character_pose: Optional[str] = None
    environment_motion: Optional[str] = None

class GameProject(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    genre: str
    prompt: str
    character_description: str
    control_scheme: str  # "dpad_buttons" or "swipe"
    target_platform: str  # "javascript", "unity", "unreal"
    scenes: List[SceneSchema] = []
    game_state: Dict[str, Any] = {}
    generated_code: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class GameGenerateRequest(BaseModel):
    prompt: str
    genre: str
    character_description: str
    control_scheme: str = "dpad_buttons"
    target_platform: str = "javascript"
    game_name: Optional[str] = None

class AddSceneRequest(BaseModel):
    game_id: str
    scene_prompt: str

class GenerateCodeRequest(BaseModel):
    game_id: str

class GeneratePreviewImageRequest(BaseModel):
    genre: str
    scene_description: str
    character_description: str
    style: str = "high-fidelity 3D realistic"

# ============ HELPER FUNCTIONS ============

async def generate_game_schema(prompt: str, genre: str, character: str, control_scheme: str) -> dict:
    """Use Claude to generate game schema"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"game-gen-{uuid.uuid4()}",
        system_message="""You are an expert game designer AI. Generate detailed game schemas in JSON format.
You must return ONLY valid JSON without any markdown formatting or code blocks.
Follow the exact structure requested."""
    ).with_model("anthropic", "claude-4-sonnet-20250514")
    
    control_desc = """
Controls (D-Pad + ABCD Buttons):
- Left Hand: D-Pad for movement (Up/Down/Left/Right)
- Right Hand: A (Action/Shoot), B (Jump), C (Special/Kick), D (Boost/Special Weapon)
""" if control_scheme == "dpad_buttons" else """
Controls (Swipe):
- Swipe Up/Down/Left/Right for movement
- Tap center for Action
- Double tap for Jump
- Long press for Special
- Two-finger tap for Boost
"""
    
    user_message = UserMessage(
        text=f"""Generate a game schema for the following:

Genre: {genre}
Game Concept: {prompt}
Main Character: {character}
{control_desc}

Return a JSON object with this EXACT structure (no markdown, no code blocks, just pure JSON):
{{
  "game_name": "string - creative name for the game",
  "genre": "{genre}",
  "story_premise": "string - brief story setup",
  "main_character": {{
    "name": "string",
    "description": "string based on: {character}",
    "abilities": ["list of abilities"]
  }},
  "initial_scene": {{
    "scene_id": "scene_001",
    "setting": "string - describe the environment",
    "characters": ["list of characters in scene"],
    "player_action": "string - what player does",
    "mechanic": "string - core game mechanic",
    "success_outcome": "string - what happens on success",
    "failure_outcome": "string - what happens on failure",
    "video_length_seconds": 10,
    "camera": "string - camera angle/movement",
    "character_pose": "string - character animation state",
    "environment_motion": "string - background animation"
  }},
  "game_state": {{
    "player_health": 100,
    "score": 0,
    "level": 1,
    "inventory": []
  }},
  "next_scene_prompts": ["2-3 possible next scene descriptions"]
}}"""
    )
    
    response = await chat.send_message(user_message)
    
    # Parse the JSON response
    import json
    try:
        # Clean up response - remove any markdown code blocks if present
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        return json.loads(clean_response.strip())
    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse AI response: {response}")
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")

async def generate_platform_code(game: GameProject) -> str:
    """Generate code for the target platform"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"code-gen-{uuid.uuid4()}",
        system_message="""You are an expert game developer. Generate production-ready game code.
Return ONLY the code without any explanations or markdown formatting."""
    ).with_model("anthropic", "claude-4-sonnet-20250514")
    
    platform_instructions = {
        "javascript": """Generate a complete HTML5 Canvas + JavaScript game.
Include:
- HTML structure with canvas
- JavaScript game loop
- Input handling for the specified control scheme
- Basic collision detection
- Score tracking
- Game state management
Make it immediately playable in a browser.""",
        "unity": """Generate Unity C# scripts for this game.
Include:
- GameManager.cs - main game controller
- PlayerController.cs - player movement and actions
- InputManager.cs - handle the specified control scheme
- GameState.cs - track game state
- Scene scripts for the defined scenes
Use Unity's new Input System format.""",
        "unreal": """Generate Unreal Engine C++ code for this game.
Include:
- GameMode class
- PlayerController class  
- PlayerCharacter class with movement
- Input handling for the specified control scheme
- Game state management
- Blueprint-friendly with UFUNCTION/UPROPERTY macros"""
    }
    
    control_mapping = """
Control Mapping (D-Pad + ABCD):
- D-Pad Up: Move Forward/Up
- D-Pad Down: Move Backward/Down  
- D-Pad Left: Move Left
- D-Pad Right: Move Right
- A Button: Primary Action (Shoot/Attack)
- B Button: Jump
- C Button: Secondary Action (Special/Kick)
- D Button: Boost/Special Weapon
""" if game.control_scheme == "dpad_buttons" else """
Control Mapping (Swipe):
- Swipe Up: Move Forward/Up
- Swipe Down: Move Backward/Down
- Swipe Left: Move Left
- Swipe Right: Move Right
- Tap: Primary Action
- Double Tap: Jump
- Long Press: Secondary Action
- Two-Finger Tap: Boost
"""
    
    scenes_json = [{"scene_id": s.scene_id, "setting": s.setting, "mechanic": s.mechanic} for s in game.scenes]
    
    user_message = UserMessage(
        text=f"""Generate {game.target_platform.upper()} game code for:

Game: {game.name}
Genre: {game.genre}
Concept: {game.prompt}
Character: {game.character_description}

{control_mapping}

Scenes: {scenes_json}

Game State: {game.game_state}

{platform_instructions.get(game.target_platform, platform_instructions['javascript'])}

Return only the code, properly formatted and ready to use."""
    )
    
    response = await chat.send_message(user_message)
    return response

# ============ API ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "Game Generator API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "llm_configured": bool(EMERGENT_LLM_KEY)}

@api_router.post("/games/generate")
async def generate_game(request: GameGenerateRequest):
    """Generate a new game from prompt"""
    try:
        # Generate game schema using AI
        schema = await generate_game_schema(
            prompt=request.prompt,
            genre=request.genre,
            character=request.character_description,
            control_scheme=request.control_scheme
        )
        
        # Create initial scene from schema
        initial_scene = SceneSchema(
            scene_id=schema.get("initial_scene", {}).get("scene_id", "scene_001"),
            setting=schema.get("initial_scene", {}).get("setting", ""),
            characters=schema.get("initial_scene", {}).get("characters", []),
            player_action=schema.get("initial_scene", {}).get("player_action", ""),
            mechanic=schema.get("initial_scene", {}).get("mechanic", ""),
            success_outcome=schema.get("initial_scene", {}).get("success_outcome", ""),
            failure_outcome=schema.get("initial_scene", {}).get("failure_outcome", ""),
            video_length_seconds=schema.get("initial_scene", {}).get("video_length_seconds", 10),
            camera=schema.get("initial_scene", {}).get("camera"),
            character_pose=schema.get("initial_scene", {}).get("character_pose"),
            environment_motion=schema.get("initial_scene", {}).get("environment_motion")
        )
        
        # Create game project
        game = GameProject(
            name=request.game_name or schema.get("game_name", "Untitled Game"),
            genre=request.genre,
            prompt=request.prompt,
            character_description=request.character_description,
            control_scheme=request.control_scheme,
            target_platform=request.target_platform,
            scenes=[initial_scene],
            game_state=schema.get("game_state", {"player_health": 100, "score": 0, "level": 1})
        )
        
        # Save to database
        await db.games.insert_one(game.dict())
        
        return {
            "success": True,
            "game": game.dict(),
            "schema": schema,
            "next_scene_prompts": schema.get("next_scene_prompts", [])
        }
    except Exception as e:
        logging.error(f"Game generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/games/{game_id}/add-scene")
async def add_scene(game_id: str, request: AddSceneRequest):
    """Add a new scene to an existing game"""
    game_data = await db.games.find_one({"id": game_id})
    if not game_data:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = GameProject(**game_data)
    
    # Generate new scene
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"scene-gen-{uuid.uuid4()}",
        system_message="You are a game designer. Generate scene schemas in JSON format only."
    ).with_model("anthropic", "claude-4-sonnet-20250514")
    
    user_message = UserMessage(
        text=f"""Generate a new scene for this game:
Game: {game.name}
Genre: {game.genre}
Existing scenes: {len(game.scenes)}
Scene prompt: {request.scene_prompt}

Return ONLY a JSON object with:
{{
  "scene_id": "scene_{len(game.scenes) + 1:03d}",
  "setting": "description",
  "characters": ["list"],
  "player_action": "action",
  "mechanic": "mechanic",
  "success_outcome": "outcome",
  "failure_outcome": "outcome",
  "video_length_seconds": 10,
  "camera": "camera description",
  "character_pose": "pose",
  "environment_motion": "motion"
}}"""
    )
    
    response = await chat.send_message(user_message)
    
    import json
    try:
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        scene_data = json.loads(clean_response.strip())
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse scene response")
    
    new_scene = SceneSchema(**scene_data)
    
    # Update game
    await db.games.update_one(
        {"id": game_id},
        {
            "$push": {"scenes": new_scene.dict()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"success": True, "scene": new_scene.dict()}

@api_router.post("/games/{game_id}/generate-code")
async def generate_code(game_id: str):
    """Generate platform-specific code for a game"""
    game_data = await db.games.find_one({"id": game_id})
    if not game_data:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = GameProject(**game_data)
    
    # Generate code
    code = await generate_platform_code(game)
    
    # Update game with generated code
    await db.games.update_one(
        {"id": game_id},
        {"$set": {"generated_code": code, "updated_at": datetime.utcnow()}}
    )
    
    return {"success": True, "code": code, "platform": game.target_platform}

@api_router.get("/games")
async def list_games():
    """List all games"""
    games = await db.games.find().sort("created_at", -1).to_list(100)
    return [{**g, "_id": str(g["_id"])} for g in games]

@api_router.get("/games/{game_id}")
async def get_game(game_id: str):
    """Get a specific game"""
    game = await db.games.find_one({"id": game_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return {**game, "_id": str(game["_id"])}

@api_router.delete("/games/{game_id}")
async def delete_game(game_id: str):
    """Delete a game"""
    result = await db.games.delete_one({"id": game_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Game not found")
    return {"success": True, "message": "Game deleted"}

@api_router.get("/genres")
async def get_genres():
    """Get available game genres"""
    return {
        "genres": [
            {"id": "shooter", "name": "3D Shooter", "icon": "crosshair", "color": "#FF4444", "description": "First/Third person shooting action"},
            {"id": "racing", "name": "3D Racing", "icon": "car", "color": "#FFEAA7", "description": "High-speed racing games"},
            {"id": "sports", "name": "3D Sports", "icon": "football", "color": "#44FF44", "description": "Football, basketball, soccer games"},
            {"id": "adventure", "name": "3D Adventure", "icon": "compass", "color": "#45B7D1", "description": "Open world exploration"},
            {"id": "fighting", "name": "3D Fighting", "icon": "hand-left", "color": "#FF6B6B", "description": "Combat and martial arts"},
            {"id": "rpg", "name": "3D RPG", "icon": "shield", "color": "#DDA0DD", "description": "Role-playing fantasy games"},
            {"id": "platformer", "name": "3D Platformer", "icon": "walk", "color": "#96CEB4", "description": "Jump and run games"},
            {"id": "horror", "name": "3D Horror", "icon": "skull", "color": "#8B0000", "description": "Survival horror games"},
            {"id": "simulation", "name": "3D Simulation", "icon": "airplane", "color": "#87CEEB", "description": "Flight, driving, life sims"},
            {"id": "puzzle", "name": "3D Puzzle", "icon": "extension-puzzle", "color": "#4ECDC4", "description": "Brain-teasing challenges"}
        ]
    }

@api_router.get("/platforms")
async def get_platforms():
    """Get available target platforms"""
    return {
        "platforms": [
            {"id": "javascript", "name": "JavaScript/HTML5", "description": "Web browser playable"},
            {"id": "unity", "name": "Unity C#", "description": "Unity Engine compatible"},
            {"id": "unreal", "name": "Unreal C++", "description": "Unreal Engine compatible"}
        ]
    }

@api_router.get("/control-schemes")
async def get_control_schemes():
    """Get available control schemes"""
    return {
        "schemes": [
            {
                "id": "dpad_buttons",
                "name": "D-Pad + ABCD Buttons",
                "description": "Classic controller layout",
                "left_hand": "D-Pad (Up/Down/Left/Right)",
                "right_hand": {
                    "A": "Action/Shoot",
                    "B": "Jump",
                    "C": "Special/Kick",
                    "D": "Boost/Special Weapon"
                }
            },
            {
                "id": "swipe",
                "name": "Swipe Controls",
                "description": "Touch-based movement",
                "gestures": {
                    "swipe": "Movement in swipe direction",
                    "tap": "Primary Action",
                    "double_tap": "Jump",
                    "long_press": "Special Action",
                    "two_finger_tap": "Boost"
                }
            }
        ]
    }

@api_router.post("/generate-preview-image")
async def generate_preview_image(request: GeneratePreviewImageRequest):
    """Generate AI preview image for game scene"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"preview-img-{uuid.uuid4()}",
            system_message="You are an expert AAA game artist specializing in high-fidelity 3D game visuals like Unreal Engine 5 and Unity HDRP quality."
        ).with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        # Detailed genre-specific styles for AAA quality
        genre_styles = {
            "shooter": """MILITARY/SCI-FI SHOOTER:
- Environment: Urban warfare zone OR futuristic space station with destruction
- Character: Armored soldier with tactical gear, assault rifle, helmet with HUD visor
- Lighting: Dramatic shadows, muzzle flash effects, volumetric dust and smoke
- Details: Shell casings, debris, bullet holes, particle effects
- Camera: Over-the-shoulder third-person view, slight motion blur
- Reference: Call of Duty, Battlefield, Halo quality""",
            
            "racing": """HIGH-SPEED RACING:
- Environment: Professional race track OR city streets with neon lights at night
- Vehicle: Sleek sports car/supercar with realistic reflections and paint
- Lighting: Motion blur streaks, headlight beams, lens flares
- Details: Tire smoke, sparks from scraping, heat distortion from exhaust
- Camera: Dynamic chase camera behind the car, sense of extreme speed
- Reference: Need for Speed, Forza Horizon, Gran Turismo quality""",
            
            "sports": """PROFESSIONAL SPORTS:
- Environment: Packed stadium with crowd, professional field/court with markings
- Character: Athletic player in team uniform, dynamic action pose
- Lighting: Stadium floodlights, dramatic shadows, sweat glistening
- Details: Ball in motion, grass/court texture, scoreboard, cheering fans
- Camera: Broadcast-style dynamic angle capturing the action
- Reference: FIFA, NBA 2K, Madden quality""",
            
            "adventure": """OPEN WORLD ADVENTURE:
- Environment: Lush jungle OR ancient ruins OR vast mountain landscape
- Character: Explorer/adventurer with gear, climbing or exploring
- Lighting: Golden hour god rays through trees, atmospheric fog
- Details: Detailed foliage, ancient stonework, wildlife, water reflections
- Camera: Wide cinematic shot showing scale of environment
- Reference: Uncharted, Tomb Raider, Horizon quality""",
            
            "fighting": """COMBAT FIGHTING:
- Environment: Arena or street fight location with dramatic backdrop
- Character: Muscular fighter in combat stance, detailed martial arts pose
- Lighting: Dramatic rim lighting, energy effects around fists
- Details: Sweat drops, torn clothing, impact effects, ki/energy auras
- Camera: Dynamic low angle showing power and intensity
- Reference: Street Fighter, Tekken, Mortal Kombat quality""",
            
            "rpg": """EPIC FANTASY RPG:
- Environment: Medieval castle OR magical forest OR dragon's lair
- Character: Armored knight or mage with glowing weapons/staff
- Lighting: Magical particle effects, torch light, mystical glows
- Details: Detailed armor engravings, spell effects, floating runes
- Camera: Epic wide shot with character silhouette against dramatic sky
- Reference: Elden Ring, God of War, Final Fantasy quality""",
            
            "platformer": """3D PLATFORMER:
- Environment: Colorful floating islands OR vibrant fantasy world
- Character: Stylized hero character, dynamic jumping pose
- Lighting: Bright and colorful, soft shadows, magical sparkles
- Details: Coins/collectibles, bouncy platforms, cartoon-realistic style
- Camera: Side-angle showing depth and platforms ahead
- Reference: Super Mario Odyssey, Ratchet & Clank, Crash Bandicoot quality""",
            
            "horror": """SURVIVAL HORROR:
- Environment: Abandoned hospital OR dark forest OR haunted mansion
- Character: Survivor with flashlight, terrified expression
- Lighting: Single flashlight beam, deep shadows, fog, moonlight
- Details: Blood stains, broken furniture, creepy atmosphere, monster silhouette
- Camera: Close over-shoulder, claustrophobic framing
- Reference: Resident Evil, Silent Hill, Dead Space quality""",
            
            "simulation": """REALISTIC SIMULATION:
- Environment: Cockpit view OR realistic city OR farm landscape
- Vehicle/Character: Detailed vehicle interior OR professional setting
- Lighting: Realistic daylight, accurate reflections, atmospheric scattering
- Details: Functional instruments, realistic textures, true-to-life scale
- Camera: First-person or realistic third-person view
- Reference: Microsoft Flight Simulator, Euro Truck Simulator quality""",
            
            "puzzle": """3D PUZZLE GAME:
- Environment: Abstract geometric space OR mystical temple with mechanisms
- Elements: Glowing puzzle pieces, energy beams, portals, platforms
- Lighting: Ethereal glow, color-coded elements, soft ambient light
- Details: Intricate mechanisms, floating objects, particle trails
- Camera: Isometric or strategic view showing puzzle layout
- Reference: Portal, The Witness, Superliminal quality"""
        }
        
        genre_style = genre_styles.get(request.genre, """DETAILED 3D GAME:
- High-fidelity realistic graphics
- Dramatic cinematic lighting
- Rich detailed textures and materials
- Professional game screenshot quality""")
        
        prompt = f"""Create an ULTRA HIGH-FIDELITY 3D video game screenshot. This must look like a real AAA game from 2024-2025.

GENRE: {request.genre.upper()}
SCENE DESCRIPTION: {request.scene_description}
MAIN CHARACTER: {request.character_description}

VISUAL STYLE REQUIREMENTS:
{genre_style}

TECHNICAL REQUIREMENTS:
- Unreal Engine 5 / Unity HDRP level graphics quality
- Ray-traced reflections and global illumination
- 8K texture detail visible
- Physically-based rendering (PBR) materials
- Subsurface scattering on skin
- Volumetric lighting and fog
- Depth of field with bokeh
- Film grain and chromatic aberration for cinematic feel
- HDR color grading
- 16:9 widescreen aspect ratio
- NO text, NO UI elements, NO watermarks

This should look indistinguishable from a real next-gen video game screenshot."""

        msg = UserMessage(text=prompt)
        text, images = await chat.send_message_multimodal_response(msg)
        
        if images and len(images) > 0:
            # Return the base64 image data
            return {
                "success": True,
                "image": f"data:{images[0]['mime_type']};base64,{images[0]['data'][:50]}...",  # Truncated for logging
                "image_data": images[0]['data'],
                "mime_type": images[0]['mime_type'],
                "text_response": text
            }
        else:
            return {
                "success": False,
                "error": "No image generated",
                "text_response": text
            }
    except Exception as e:
        logging.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class GenerateVideoSceneRequest(BaseModel):
    genre: str
    scene_description: str
    character_description: str
    action: str
    scene_number: int = 1
    total_scenes: int = 4
    user_prompt: str = ""

@api_router.post("/generate-video-scene")
async def generate_video_scene(request: GenerateVideoSceneRequest):
    """Generate a single video scene frame with character in the scene"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"video-scene-{uuid.uuid4()}",
            system_message="You are a AAA game cinematographer. Create cinematic video game scenes with characters integrated naturally into the environment."
        ).with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        # Build cinematic prompt based on user's actual input
        prompt = f"""Create an ULTRA HIGH-FIDELITY 3D VIDEO GAME CINEMATIC SCENE.

USER'S GAME CONCEPT: {request.user_prompt}

THIS IS SCENE {request.scene_number} OF {request.total_scenes}:
{request.scene_description}

ACTION/POSE: {request.action}

CHARACTER IN SCENE: {request.character_description}

CRITICAL REQUIREMENTS:
1. The character MUST be visible and integrated INTO the scene (not overlaid)
2. The character should be performing the described action naturally
3. This must look like a real AAA video game cutscene/gameplay footage
4. NO UI elements, NO health bars, NO text overlays
5. Pure cinematic video game footage only

VISUAL QUALITY:
- Unreal Engine 5 / Unity HDRP cinematic quality
- Movie-quality lighting and composition
- The character is a REAL 3D rendered character in the scene
- Ray-traced reflections and shadows
- Volumetric atmospheric effects
- Cinematic depth of field
- Film grain for cinematic feel
- 16:9 widescreen aspect ratio

Make this indistinguishable from a real next-gen video game cinematic trailer."""

        msg = UserMessage(text=prompt)
        text, images = await chat.send_message_multimodal_response(msg)
        
        if images and len(images) > 0:
            return {
                "success": True,
                "image_data": images[0]['data'],
                "mime_type": images[0]['mime_type'],
                "scene_number": request.scene_number,
                "text_response": text
            }
        else:
            return {
                "success": False,
                "error": "No scene generated",
                "scene_number": request.scene_number
            }
    except Exception as e:
        logging.error(f"Video scene generation error: {str(e)}")
        return {"success": False, "error": str(e), "scene_number": request.scene_number}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
