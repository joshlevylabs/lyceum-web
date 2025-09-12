# Lyceum - Industrial Analytics Platform

A cloud-based SaaS application that replicates and enhances the Centcom desktop experience with real-time collaboration, cloud storage, and enterprise-grade security.

## 🚀 Features

- **Analytics Studio**: Create, manage, and collaborate on analytics sessions with cloud-based storage
- **Test Data Management**: Organize and analyze measurement data projects
- **Data Visualization**: Interactive charts and graphs with measurement flagging
- **Team Collaboration**: Real-time collaboration with role-based access control
- **Cloud Storage**: Automatic session and project synchronization
- **Enterprise Security**: User authentication, encryption, and audit logging

## 🏗️ Architecture

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, authentication, real-time subscriptions)
- **Authentication**: Supabase Auth with user profiles and role management
- **Styling**: Tailwind CSS with dark mode support
- **Icons**: Heroicons
- **Charts**: Plotly.js for data visualization

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

## 🛠️ Installation

### 1. Clone and Install

```bash
git clone <repository-url>
cd lyceum
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### 3. Supabase Setup

#### Create a new Supabase project at [supabase.com](https://supabase.com)

#### Run the following SQL to create the required tables:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  company TEXT,
  role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin', 'engineer', 'analyst', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sign_in TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Analytics sessions table
CREATE TABLE analytics_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  session_type TEXT NOT NULL DEFAULT 'exploratory' CHECK (session_type IN ('exploratory', 'monitoring', 'comparison', 'collaborative')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'error')),
  created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  data_bindings JSONB NOT NULL DEFAULT '{}',
  analytics_state JSONB NOT NULL DEFAULT '{}',
  collaboration JSONB NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE
);

-- Session collaborators table
CREATE TABLE analytics_session_collaborators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  permissions JSONB NOT NULL DEFAULT '[]',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE,
  UNIQUE(session_id, user_id)
);

-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  project_key TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  groups TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  data_types TEXT[] DEFAULT '{}',
  test_configurations JSONB NOT NULL DEFAULT '{}',
  measurement_count INTEGER DEFAULT 0,
  flagged_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Measurement data table
CREATE TABLE measurement_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES analytics_sessions(id) ON DELETE SET NULL,
  measurement_id TEXT NOT NULL,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  flags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_analytics_sessions_created_by ON analytics_sessions(created_by);
CREATE INDEX idx_analytics_sessions_updated_at ON analytics_sessions(updated_at);
CREATE INDEX idx_analytics_sessions_status ON analytics_sessions(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_updated_at ON projects(updated_at);
CREATE INDEX idx_measurement_data_project_id ON measurement_data(project_id);
CREATE INDEX idx_measurement_data_session_id ON measurement_data(session_id);

-- Enable RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_session_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- User profiles: Users can read all profiles but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Analytics sessions: Users can see public sessions or sessions they own/collaborate on
CREATE POLICY "Analytics sessions are viewable by owner and collaborators" ON analytics_sessions
  FOR SELECT USING (
    is_public = true OR
    created_by = auth.uid() OR
    id IN (
      SELECT session_id FROM analytics_session_collaborators 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create analytics sessions" ON analytics_sessions
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own analytics sessions" ON analytics_sessions
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own analytics sessions" ON analytics_sessions
  FOR DELETE USING (created_by = auth.uid());

-- Projects: Users can see public projects or projects they own
CREATE POLICY "Projects are viewable by owner and public" ON projects
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (created_by = auth.uid());

-- Functions to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_analytics_sessions_updated_at
  BEFORE UPDATE ON analytics_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🎯 Key Integration with Centcom

### Analytics Studio Sessions

The Lyceum Analytics Studio is designed to seamlessly integrate with your existing Centcom desktop application:

1. **Cloud Session Storage**: Sessions created in Lyceum are stored in the cloud and can be accessed from anywhere
2. **Save to Lyceum**: From your Centcom desktop app, you can save Analytics Studio sessions directly to Lyceum
3. **Cross-Platform Access**: Sessions saved from the desktop app are immediately available in the web interface
4. **Collaboration**: Share sessions with team members for real-time collaboration

### Modified Centcom Integration

To enable saving sessions to Lyceum from your Centcom desktop application, modify your Analytics Studio to include a "Save to Lyceum" option that:

1. Authenticates with your Lyceum instance
2. Uploads session data via the `/api/analytics-sessions` endpoint
3. Provides cloud access to your desktop-created sessions

## 🔧 API Endpoints

### Analytics Sessions
- `GET /api/analytics-sessions` - List sessions with filtering
- `POST /api/analytics-sessions` - Create new session
- `GET /api/analytics-sessions/[id]` - Get specific session
- `PUT /api/analytics-sessions/[id]` - Update session
- `DELETE /api/analytics-sessions/[id]` - Delete session

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[id]` - Get specific project

## 🚀 Deployment

### Deploy to Vercel

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
NEXT_PUBLIC_APP_URL=https://thelyceum.io
NEXTAUTH_URL=https://thelyceum.io
NEXTAUTH_SECRET=your_secure_secret
```

## 🔐 Security Features

- User authentication with Supabase Auth
- Row-level security (RLS) policies
- Role-based access control
- Session encryption and secure storage
- Audit logging for sensitive operations

## 📱 Responsive Design

Lyceum is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile devices

## 🎨 Customization

The application uses Tailwind CSS for styling and supports:
- Dark/light mode
- Customizable themes
- Brand colors and logos
- Component customization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or support, please contact the development team or create an issue in the repository.

## 📄 License

This project is proprietary software. All rights reserved.
