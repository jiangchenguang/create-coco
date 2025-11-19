import {view} from '@cocojs/mvc';

interface IButtonProps {
    children: string;
    onClick?: () => void;
    type: 'primary' | 'link' | 'primary-link';
    loading?: boolean;
}

@view()
class Button {
    props: IButtonProps

    color = () => {
        switch (this.props.type) {
            case 'primary-link':
                return 'text-primary';
            case 'link':
                return 'text-primary';
            case 'primary':
                return "text-white bg-primary";
            default:
                return "text-primary border-primary border";
        }
    }

    onClick = () => {
        if (!this.props.loading) {
            this.props.onClick?.();
        }
    }

    render() {
        return <div
            className={`inline-flex justify-center items-center h-10 px-8 rounded-md cursor-pointer select-none ${this.color()}`}
            onClick={this.onClick}
        >
            {this.props.children}{this.props.loading ? `...` : null}
        </div>
    }
}

export default Button;