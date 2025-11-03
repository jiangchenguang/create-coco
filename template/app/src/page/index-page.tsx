import { page, route } from 'coco-mvc';

@route('/')
@page()
class IndexPage {
    render() {
        return <div>hello coco-mvc</div>;
    }
}

export default IndexPage;
