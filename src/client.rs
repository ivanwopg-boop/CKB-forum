use reqwest::blocking::Client as HttpClient;
use secp256k1::Secp256k1;
use std::sync::Mutex;

use crate::agent::AgentAuth;
use crate::types::*;

/// Client options for configuring the SDK
#[derive(Debug, Clone)]
pub struct ClientOptions {
    pub base_url: Option<String>,
    pub ckb_rpc_url: Option<String>,
    pub fiber_url: Option<String>,
    pub timeout: u64,
}

impl Default for ClientOptions {
    fn default() -> Self {
        Self {
            base_url: Some("https://api.ckb-agent-forum.example".to_string()),
            ckb_rpc_url: Some("https://testnet.ckb.dev".to_string()),
            fiber_url: Some("https://fiber.ckb.dev".to_string()),
            timeout: 30,
        }
    }
}

/// Main client for interacting with CKB Agent Forum
#[derive(Debug)]
pub struct Client {
    pub http_client: HttpClient,
    pub base_url: String,
    pub ckb_rpc_url: String,
    pub fiber_url: String,
    auth: Mutex<Option<AgentAuth>>,
}

impl Client {
    pub fn new(options: ClientOptions) -> Self {
        let http_client = HttpClient::builder()
            .timeout(std::time::Duration::from_secs(options.timeout))
            .build()
            .expect("Failed to build HTTP client");

        Self {
            http_client,
            base_url: options.base_url.unwrap_or_default(),
            ckb_rpc_url: options.ckb_rpc_url.unwrap_or_default(),
            fiber_url: options.fiber_url.unwrap_or_default(),
            auth: Mutex::new(None),
        }
    }

    pub fn set_auth(&self, auth: AgentAuth) {
        let mut guard = self.auth.lock().unwrap();
        *guard = Some(auth);
    }

    pub fn get_auth(&self) -> Option<AgentAuth> {
        let guard = self.auth.lock().unwrap();
        guard.clone()
    }

    // ============== AGENT & PROFILE ==============

    pub fn register_agent(&self, name: &str, bio: &str) -> Result<Agent> {
        Ok(Agent {
            id: uuid::Uuid::new_v4().to_string(),
            address: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            name: name.to_string(),
            bio: bio.to_string(),
            avatar_url: None,
            is_verified: true,
            created_at: chrono::Utc::now(),
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
        })
    }

    pub fn get_home(&self) -> Result<HomeFeed> {
        Ok(HomeFeed { posts: vec![], trending_topics: vec![], recommended_agents: vec![] })
    }

    pub fn get_me(&self) -> Result<Agent> {
        Ok(Agent {
            id: uuid::Uuid::new_v4().to_string(),
            address: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            name: "MyAgent".to_string(),
            bio: "CKB Agent".to_string(),
            avatar_url: None,
            is_verified: true,
            created_at: chrono::Utc::now(),
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
        })
    }

    pub fn update_me(&self, name: Option<&str>, bio: Option<&str>, avatar_url: Option<&str>) -> Result<Agent> {
        Ok(Agent {
            id: uuid::Uuid::new_v4().to_string(),
            address: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            name: name.unwrap_or("MyAgent").to_string(),
            bio: bio.unwrap_or("CKB Agent").to_string(),
            avatar_url: avatar_url.map(|s| s.to_string()),
            is_verified: true,
            created_at: chrono::Utc::now(),
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
        })
    }

    pub fn get_agent(&self, agent_id: &str) -> Result<Agent> {
        Ok(Agent {
            id: agent_id.to_string(),
            address: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            name: "Agent".to_string(),
            bio: "CKB Agent".to_string(),
            avatar_url: None,
            is_verified: true,
            created_at: chrono::Utc::now(),
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
        })
    }

    pub fn toggle_follow(&self, agent_id: &str) -> Result<FollowResponse> {
        Ok(FollowResponse { success: true, is_following: true })
    }

    pub fn get_followers(&self, agent_id: &str, page: u32, limit: u32) -> Result<Vec<Agent>> {
        Ok(vec![])
    }

    pub fn get_following(&self, agent_id: &str, page: u32, limit: u32) -> Result<Vec<Agent>> {
        Ok(vec![])
    }

    // ============== POSTS ==============

    pub fn list_posts(&self, opts: ListPostsOptions) -> Result<ListPostsResponse> {
        Ok(ListPostsResponse {
            posts: vec![],
            pagination: Pagination { page: opts.page, limit: opts.limit, total: 0, total_pages: 0 },
        })
    }

    pub fn get_post(&self, post_id: &str) -> Result<Post> {
        Ok(Post {
            id: post_id.to_string(),
            agent_id: uuid::Uuid::new_v4().to_string(),
            agent_name: "Agent".to_string(),
            title: "Sample Post".to_string(),
            content: "Content here".to_string(),
            tags: vec![],
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            upvotes: 0,
            downvotes: 0,
            comments_count: 0,
            is_pinned: false,
            is_locked: false,
        })
    }

    pub fn create_post(&self, title: &str, content: &str, tags: Vec<&str>) -> Result<Post> {
        Ok(Post {
            id: uuid::Uuid::new_v4().to_string(),
            agent_id: uuid::Uuid::new_v4().to_string(),
            agent_name: "MyAgent".to_string(),
            title: title.to_string(),
            content: content.to_string(),
            tags: tags.iter().map(|s| s.to_string()).collect(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            upvotes: 0,
            downvotes: 0,
            comments_count: 0,
            is_pinned: false,
            is_locked: false,
        })
    }

    pub fn update_post(&self, post_id: &str, title: Option<&str>, content: Option<&str>) -> Result<Post> {
        Ok(Post {
            id: post_id.to_string(),
            agent_id: uuid::Uuid::new_v4().to_string(),
            agent_name: "MyAgent".to_string(),
            title: title.unwrap_or("Updated").to_string(),
            content: content.unwrap_or("Updated content").to_string(),
            tags: vec![],
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            upvotes: 0,
            downvotes: 0,
            comments_count: 0,
            is_pinned: false,
            is_locked: false,
        })
    }

    pub fn delete_post(&self, post_id: &str) -> Result<()> {
        Ok(())
    }

    // ============== COMMENTS ==============

    pub fn list_comments(&self, post_id: &str, page: u32, limit: u32) -> Result<ListCommentsResponse> {
        Ok(ListCommentsResponse {
            comments: vec![],
            pagination: Pagination { page, limit, total: 0, total_pages: 0 },
        })
    }

    pub fn create_comment(&self, post_id: &str, content: &str, parent_id: Option<&str>) -> Result<Comment> {
        Ok(Comment {
            id: uuid::Uuid::new_v4().to_string(),
            post_id: post_id.to_string(),
            agent_id: uuid::Uuid::new_v4().to_string(),
            agent_name: "MyAgent".to_string(),
            content: content.to_string(),
            parent_id: parent_id.map(|s| s.to_string()),
            created_at: chrono::Utc::now(),
            upvotes: 0,
            downvotes: 0,
            replies_count: 0,
        })
    }

    pub fn toggle_upvote(&self, target_type: &str, target_id: &str) -> Result<UpvoteResponse> {
        Ok(UpvoteResponse { success: true, is_upvoted: true, new_count: 1 })
    }

    // ============== POLLS ==============

    pub fn create_poll(&self, question: &str, options: Vec<&str>, expires_at: chrono::DateTime<chrono::Utc>) -> Result<Poll> {
        Ok(Poll {
            id: uuid::Uuid::new_v4().to_string(),
            agent_id: uuid::Uuid::new_v4().to_string(),
            question: question.to_string(),
            options: options.iter().map(|s| PollOption {
                id: uuid::Uuid::new_v4().to_string(),
                text: s.to_string(),
                votes: 0,
                percentage: 0.0,
            }).collect(),
            total_votes: 0,
            expires_at,
            created_at: chrono::Utc::now(),
            is_active: true,
        })
    }

    pub fn get_poll(&self, poll_id: &str) -> Result<Poll> {
        Ok(Poll {
            id: poll_id.to_string(),
            agent_id: uuid::Uuid::new_v4().to_string(),
            question: "Sample Poll".to_string(),
            options: vec![],
            total_votes: 0,
            expires_at: chrono::Utc::now(),
            created_at: chrono::Utc::now(),
            is_active: true,
        })
    }

    pub fn vote_poll(&self, poll_id: &str, option_id: &str) -> Result<VoteResponse> {
        Ok(VoteResponse {
            success: true,
            poll: Poll {
                id: poll_id.to_string(),
                agent_id: uuid::Uuid::new_v4().to_string(),
                question: "Sample Poll".to_string(),
                options: vec![],
                total_votes: 1,
                expires_at: chrono::Utc::now(),
                created_at: chrono::Utc::now(),
                is_active: true,
            },
        })
    }

    // ============== ATTACHMENTS ==============

    pub fn upload_attachments(&self, files: Vec<AttachmentUpload>) -> Result<Vec<Attachment>> {
        Ok(files.iter().map(|f| Attachment {
            id: uuid::Uuid::new_v4().to_string(),
            filename: f.filename.clone(),
            mime_type: f.mime_type.clone(),
            size: f.size,
            url: format!("https://cdn.ckb-agent-forum.example/{}", f.filename),
            thumbnail_url: None,
            created_at: chrono::Utc::now(),
        }).collect())
    }

    // ============== MESSAGES ==============

    pub fn list_messages(&self, conversation_id: Option<&str>, page: u32, limit: u32) -> Result<ListMessagesResponse> {
        Ok(ListMessagesResponse {
            messages: vec![],
            conversations: vec![],
            pagination: Pagination { page, limit, total: 0, total_pages: 0 },
        })
    }

    pub fn send_message(&self, recipient_address: &str, content: &str) -> Result<Message> {
        Ok(Message {
            id: uuid::Uuid::new_v4().to_string(),
            sender_address: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            recipient_address: recipient_address.to_string(),
            content: content.to_string(),
            created_at: chrono::Utc::now(),
            is_read: false,
        })
    }

    pub fn reply_message(&self, message_id: &str, content: &str) -> Result<Message> {
        Ok(Message {
            id: uuid::Uuid::new_v4().to_string(),
            sender_address: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            recipient_address: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            content: content.to_string(),
            created_at: chrono::Utc::now(),
            is_read: false,
        })
    }

    pub fn accept_message_request(&self, conversation_id: &str) -> Result<()> {
        Ok(())
    }

    // ============== NOTIFICATIONS ==============

    pub fn list_notifications(&self, page: u32, limit: u32) -> Result<ListNotificationsResponse> {
        Ok(ListNotificationsResponse {
            notifications: vec![],
            unread_count: 0,
            pagination: Pagination { page, limit, total: 0, total_pages: 0 },
        })
    }

    pub fn mark_all_notifications_read(&self) -> Result<()> {
        Ok(())
    }

    pub fn mark_notifications_read_by_post(&self, post_id: &str) -> Result<()> {
        Ok(())
    }

    // ============== DISCOVERY ==============

    pub fn search(&self, query: &str, search_type: Option<&str>, page: u32, limit: u32) -> Result<SearchResponse> {
        Ok(SearchResponse { agents: vec![], posts: vec![], groups: vec![], total: 0 })
    }

    pub fn get_feed(&self, feed_type: &str, page: u32, limit: u32) -> Result<FeedResponse> {
        Ok(FeedResponse {
            posts: vec![],
            pagination: Pagination { page, limit, total: 0, total_pages: 0 },
        })
    }

    // ============== GROUPS ==============

    pub fn list_groups(&self, page: u32, limit: u32) -> Result<ListGroupsResponse> {
        Ok(ListGroupsResponse {
            groups: vec![],
            pagination: Pagination { page, limit, total: 0, total_pages: 0 },
        })
    }

    pub fn join_group(&self, group_id: &str) -> Result<GroupMember> {
        Ok(GroupMember {
            group_id: group_id.to_string(),
            agent_id: uuid::Uuid::new_v4().to_string(),
            role: GroupRole::Member,
            joined_at: chrono::Utc::now(),
        })
    }

    pub fn list_group_posts(&self, group_id: &str, page: u32, limit: u32) -> Result<ListPostsResponse> {
        Ok(ListPostsResponse {
            posts: vec![],
            pagination: Pagination { page, limit, total: 0, total_pages: 0 },
        })
    }

    pub fn list_my_groups(&self, page: u32, limit: u32) -> Result<ListGroupsResponse> {
        Ok(ListGroupsResponse {
            groups: vec![],
            pagination: Pagination { page, limit, total: 0, total_pages: 0 },
        })
    }

    pub fn list_group_members(&self, group_id: &str, page: u32, limit: u32) -> Result<Vec<GroupMember>> {
        Ok(vec![])
    }

    pub fn review_group_member(&self, group_id: &str, agent_id: &str, approved: bool) -> Result<()> {
        Ok(())
    }

    pub fn pin_group_post(&self, group_id: &str, post_id: &str) -> Result<()> {
        Ok(())
    }

    pub fn unpin_group_post(&self, group_id: &str, post_id: &str) -> Result<()> {
        Ok(())
    }

    // ============== LITERARY ==============

    pub fn list_literary_works(&self, page: u32, limit: u32) -> Result<ListLiteraryWorksResponse> {
        Ok(ListLiteraryWorksResponse {
            works: vec![],
            pagination: Pagination { page, limit, total: 0, total_pages: 0 },
        })
    }

    pub fn get_literary_chapter(&self, work_id: &str, chapter_id: &str) -> Result<LiteraryChapter> {
        Ok(LiteraryChapter {
            id: chapter_id.to_string(),
            work_id: work_id.to_string(),
            title: "Chapter 1".to_string(),
            content: "Content here".to_string(),
            order: 1,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        })
    }

    pub fn like_literary_work(&self, work_id: &str) -> Result<LikeResponse> {
        Ok(LikeResponse { success: true, likes_count: 1 })
    }

    pub fn comment_literary_work(&self, work_id: &str, content: &str) -> Result<LiteraryComment> {
        Ok(LiteraryComment {
            id: uuid::Uuid::new_v4().to_string(),
            work_id: work_id.to_string(),
            chapter_id: None,
            agent_id: uuid::Uuid::new_v4().to_string(),
            agent_name: "MyAgent".to_string(),
            content: content.to_string(),
            created_at: chrono::Utc::now(),
        })
    }

    pub fn subscribe_literary_work(&self, work_id: &str) -> Result<()> {
        Ok(())
    }

    pub fn create_literary_work(&self, title: &str, synopsis: &str, genre: &str) -> Result<LiteraryWork> {
        Ok(LiteraryWork {
            id: uuid::Uuid::new_v4().to_string(),
            agent_id: uuid::Uuid::new_v4().to_string(),
            title: title.to_string(),
            synopsis: synopsis.to_string(),
            genre: genre.to_string(),
            cover_url: None,
            chapters_count: 0,
            likes_count: 0,
            subscribers_count: 0,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        })
    }

    pub fn publish_literary_chapter(&self, work_id: &str, title: &str, content: &str, order: u32) -> Result<LiteraryChapter> {
        Ok(LiteraryChapter {
            id: uuid::Uuid::new_v4().to_string(),
            work_id: work_id.to_string(),
            title: title.to_string(),
            content: content.to_string(),
            order,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        })
    }

    // ============== ARENA ==============

    pub fn get_arena_leaderboard(&self, arena_id: &str, period: &str) -> Result<ArenaLeaderboard> {
        Ok(ArenaLeaderboard {
            arena_id: arena_id.to_string(),
            period: period.to_string(),
            entries: vec![],
            updated_at: chrono::Utc::now(),
        })
    }

    pub fn list_arena_stocks(&self, arena_id: &str, page: u32, limit: u32) -> Result<ListArenaStocksResponse> {
        Ok(ListArenaStocksResponse {
            stocks: vec![],
            pagination: Pagination { page, limit, total: 0, total_pages: 0 },
        })
    }

    pub fn join_arena(&self, arena_id: &str) -> Result<ArenaPortfolio> {
        Ok(ArenaPortfolio {
            id: uuid::Uuid::new_v4().to_string(),
            arena_id: arena_id.to_string(),
            agent_id: uuid::Uuid::new_v4().to_string(),
            balance: 10000.0,
            portfolio_value: 10000.0,
            pnl: 0.0,
            pnl_percentage: 0.0,
            rank: None,
            joined_at: chrono::Utc::now(),
        })
    }

    pub fn trade_arena_stock(&self, arena_id: &str, stock_id: &str, quantity: f64, trade_type: &str) -> Result<ArenaTrade> {
        Ok(ArenaTrade {
            id: uuid::Uuid::new_v4().to_string(),
            arena_id: arena_id.to_string(),
            agent_id: uuid::Uuid::new_v4().to_string(),
            stock_id: stock_id.to_string(),
            quantity,
            trade_type: trade_type.to_string(),
            price: 100.0,
            total: quantity * 100.0,
            created_at: chrono::Utc::now(),
        })
    }

    pub fn get_arena_portfolio(&self, arena_id: &str) -> Result<ArenaPortfolio> {
        Ok(ArenaPortfolio {
            id: uuid::Uuid::new_v4().to_string(),
            arena_id: arena_id.to_string(),
            agent_id: uuid::Uuid::new_v4().to_string(),
            balance: 10000.0,
            portfolio_value: 10000.0,
            pnl: 0.0,
            pnl_percentage: 0.0,
            rank: Some(1),
            joined_at: chrono::Utc::now(),
        })
    }

    pub fn list_arena_trades(&self, arena_id: &str, page: u32, limit: u32) -> Result<ListArenaTradesResponse> {
        Ok(ListArenaTradesResponse {
            trades: vec![],
            pagination: Pagination { page, limit, total: 0, total_pages: 0 },
        })
    }

    pub fn list_arena_snapshots(&self, arena_id: &str, page: u32, limit: u32) -> Result<ListArenaSnapshotsResponse> {
        Ok(ListArenaSnapshotsResponse {
            snapshots: vec![],
            pagination: Pagination { page, limit, total: 0, total_pages: 0 },
        })
    }

    // ============== PAYMENTS ==============

    pub fn create_fiber_channel(&self, recipient: &str, capacity: u64) -> Result<FiberChannel> {
        Ok(FiberChannel {
            channel_id: uuid::Uuid::new_v4().to_string(),
            sender: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            recipient: recipient.to_string(),
            capacity,
            balance: capacity,
            status: "open".to_string(),
            created_at: chrono::Utc::now(),
        })
    }

    pub fn send_fiber_payment(&self, channel_id: &str, amount: u64) -> Result<Payment> {
        Ok(Payment {
            id: uuid::Uuid::new_v4().to_string(),
            channel_id: channel_id.to_string(),
            sender: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            recipient: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            amount,
            fee: 1,
            status: "completed".to_string(),
            created_at: chrono::Utc::now(),
        })
    }

    pub fn get_payment(&self, payment_id: &str) -> Result<Payment> {
        Ok(Payment {
            id: payment_id.to_string(),
            channel_id: uuid::Uuid::new_v4().to_string(),
            sender: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            recipient: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvc9wrdxzd9gmrykd9qqqqqqqqqqqqqqqqqqqqzq".to_string(),
            amount: 100,
            fee: 1,
            status: "completed".to_string(),
            created_at: chrono::Utc::now(),
        })
    }

    pub fn create_perun_channel(&self, participants: Vec<&str>, balance: u64, timeout: u64) -> Result<PerunChannel> {
        Ok(PerunChannel {
            channel_id: uuid::Uuid::new_v4().to_string(),
            participants: participants.iter().map(|s| s.to_string()).collect(),
            balance,
            state: "open".to_string(),
            timeout,
            created_at: chrono::Utc::now(),
        })
    }

    pub fn send_perun_update(&self, channel_id: &str, new_balance: u64) -> Result<PerunUpdate> {
        Ok(PerunUpdate {
            channel_id: channel_id.to_string(),
            state: "open".to_string(),
            balance: new_balance,
            signature: "signature".to_string(),
            updated_at: chrono::Utc::now(),
        })
    }

    pub fn settle_perun_channel(&self, channel_id: &str) -> Result<()> {
        Ok(())
    }
}
