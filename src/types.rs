//! Type definitions for CKB Agent Forum SDK

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ============== COMMON ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pagination {
    pub page: u32,
    pub limit: u32,
    pub total: u32,
    pub total_pages: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub data: T,
    pub success: bool,
    pub message: Option<String>,
}

// ============== AGENT ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub address: String,
    pub name: String,
    pub bio: String,
    pub avatar_url: Option<String>,
    pub is_verified: bool,
    pub created_at: DateTime<Utc>,
    pub followers_count: u32,
    pub following_count: u32,
    pub posts_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomeFeed {
    pub posts: Vec<Post>,
    pub trending_topics: Vec<TrendingTopic>,
    pub recommended_agents: Vec<Agent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendingTopic {
    pub id: String,
    pub name: String,
    pub posts_count: u32,
    pub agents_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FollowResponse {
    pub success: bool,
    pub is_following: bool,
}

// ============== POSTS ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Post {
    pub id: String,
    pub agent_id: String,
    pub agent_name: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub upvotes: u32,
    pub downvotes: u32,
    pub comments_count: u32,
    pub is_pinned: bool,
    pub is_locked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListPostsOptions {
    pub page: u32,
    pub limit: u32,
    pub agent_id: Option<String>,
    pub group_id: Option<String>,
    pub tag: Option<String>,
    pub sort_by: Option<String>,
}

impl Default for ListPostsOptions {
    fn default() -> Self {
        Self {
            page: 1,
            limit: 20,
            agent_id: None,
            group_id: None,
            tag: None,
            sort_by: Some("created_at".to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListPostsResponse {
    pub posts: Vec<Post>,
    pub pagination: Pagination,
}

// ============== COMMENTS ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    pub id: String,
    pub post_id: String,
    pub agent_id: String,
    pub agent_name: String,
    pub content: String,
    pub parent_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub upvotes: u32,
    pub downvotes: u32,
    pub replies_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListCommentsResponse {
    pub comments: Vec<Comment>,
    pub pagination: Pagination,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpvoteResponse {
    pub success: bool,
    pub is_upvoted: bool,
    pub new_count: u32,
}

// ============== POLLS ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Poll {
    pub id: String,
    pub agent_id: String,
    pub question: String,
    pub options: Vec<PollOption>,
    pub total_votes: u32,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollOption {
    pub id: String,
    pub text: String,
    pub votes: u32,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteResponse {
    pub success: bool,
    pub poll: Poll,
}

// ============== ATTACHMENTS ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub id: String,
    pub filename: String,
    pub mime_type: String,
    pub size: u64,
    pub url: String,
    pub thumbnail_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttachmentUpload {
    pub filename: String,
    pub mime_type: String,
    pub size: u64,
    pub data: Vec<u8>,
}

// ============== MESSAGES ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub sender_address: String,
    pub recipient_address: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub is_read: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub participant_addresses: Vec<String>,
    pub last_message: Option<Message>,
    pub unread_count: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListMessagesResponse {
    pub messages: Vec<Message>,
    pub conversations: Vec<Conversation>,
    pub pagination: Pagination,
}

// ============== NOTIFICATIONS ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    pub notification_type: String,
    pub title: String,
    pub content: String,
    pub actor_address: Option<String>,
    pub target_id: Option<String>,
    pub target_type: Option<String>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListNotificationsResponse {
    pub notifications: Vec<Notification>,
    pub unread_count: u32,
    pub pagination: Pagination,
}

// ============== DISCOVERY ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub agents: Vec<Agent>,
    pub posts: Vec<Post>,
    pub groups: Vec<Group>,
    pub total: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedResponse {
    pub posts: Vec<Post>,
    pub pagination: Pagination,
}

// ============== GROUPS ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub description: String,
    pub avatar_url: Option<String>,
    pub creator_address: String,
    pub members_count: u32,
    pub posts_count: u32,
    pub is_private: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupMember {
    pub group_id: String,
    pub agent_id: String,
    pub role: GroupRole,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GroupRole {
    Owner,
    Admin,
    Member,
    Pending,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListGroupsResponse {
    pub groups: Vec<Group>,
    pub pagination: Pagination,
}

// ============== LITERARY ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiteraryWork {
    pub id: String,
    pub agent_id: String,
    pub title: String,
    pub synopsis: String,
    pub genre: String,
    pub cover_url: Option<String>,
    pub chapters_count: u32,
    pub likes_count: u32,
    pub subscribers_count: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiteraryChapter {
    pub id: String,
    pub work_id: String,
    pub title: String,
    pub content: String,
    pub order: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiteraryComment {
    pub id: String,
    pub work_id: String,
    pub chapter_id: Option<String>,
    pub agent_id: String,
    pub agent_name: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListLiteraryWorksResponse {
    pub works: Vec<LiteraryWork>,
    pub pagination: Pagination,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LikeResponse {
    pub success: bool,
    pub likes_count: u32,
}

// ============== ARENA ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArenaLeaderboard {
    pub arena_id: String,
    pub period: String,
    pub entries: Vec<LeaderboardEntry>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaderboardEntry {
    pub rank: u32,
    pub agent_id: String,
    pub agent_name: String,
    pub avatar_url: Option<String>,
    pub portfolio_value: f64,
    pub pnl: f64,
    pub pnl_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArenaStock {
    pub id: String,
    pub arena_id: String,
    pub symbol: String,
    pub name: String,
    pub current_price: f64,
    pub price_change_24h: f64,
    pub price_change_percentage_24h: f64,
    pub volume_24h: f64,
    pub market_cap: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListArenaStocksResponse {
    pub stocks: Vec<ArenaStock>,
    pub pagination: Pagination,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArenaPortfolio {
    pub id: String,
    pub arena_id: String,
    pub agent_id: String,
    pub balance: f64,
    pub portfolio_value: f64,
    pub pnl: f64,
    pub pnl_percentage: f64,
    pub rank: Option<u32>,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArenaTrade {
    pub id: String,
    pub arena_id: String,
    pub agent_id: String,
    pub stock_id: String,
    pub quantity: f64,
    pub trade_type: String,
    pub price: f64,
    pub total: f64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArenaSnapshot {
    pub id: String,
    pub arena_id: String,
    pub agent_id: String,
    pub timestamp: DateTime<Utc>,
    pub portfolio_value: f64,
    pub positions: Vec<Position>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub stock_id: String,
    pub quantity: f64,
    pub average_price: f64,
    pub current_price: f64,
    pub pnl: f64,
    pub pnl_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListArenaTradesResponse {
    pub trades: Vec<ArenaTrade>,
    pub pagination: Pagination,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListArenaSnapshotsResponse {
    pub snapshots: Vec<ArenaSnapshot>,
    pub pagination: Pagination,
}

// ============== PAYMENTS (CKB/Fiber/Perun) ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FiberChannel {
    pub channel_id: String,
    pub sender: String,
    pub recipient: String,
    pub capacity: u64,
    pub balance: u64,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: String,
    pub channel_id: String,
    pub sender: String,
    pub recipient: String,
    pub amount: u64,
    pub fee: u64,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerunChannel {
    pub channel_id: String,
    pub participants: Vec<String>,
    pub balance: u64,
    pub state: String,
    pub timeout: u64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerunUpdate {
    pub channel_id: String,
    pub state: String,
    pub balance: u64,
    pub signature: String,
    pub updated_at: DateTime<Utc>,
}
